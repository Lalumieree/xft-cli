import { basename } from "node:path";
import { sm4DecryptEcb, sm4EncryptEcb } from "./crypto.js";
import { XftOpenApiReqClient } from "./open-api-client.js";
import type {
  BaseReqInf,
  FeatureCallInput,
  FeatureCallResult,
  FeatureDefinition,
  FeatureRequestMode,
  FeatureResponseMode,
} from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertStringField(value: unknown, key: string): string {
  if (typeof value !== "string" || value === "") {
    throw new Error(`feature-call invalid feature: "${key}" must be a non-empty string`);
  }
  return value;
}

function assertBooleanField(value: unknown, key: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`feature-call invalid feature: "${key}" must be a boolean`);
  }
  return value;
}

function assertMethodField(value: unknown): "GET" | "POST" {
  if (value === "GET" || value === "POST") {
    return value;
  }
  throw new Error('feature-call invalid feature: "method" must be "GET" or "POST"');
}

function assertRequestModeField(value: unknown): FeatureRequestMode {
  if (value === "json" || value === "upload" || value === "none") {
    return value;
  }
  throw new Error('feature-call invalid feature: "requestMode" must be "json", "upload", or "none"');
}

function assertResponseModeField(value: unknown): FeatureResponseMode {
  if (value === "json" || value === "text" || value === "binary") {
    return value;
  }
  throw new Error('feature-call invalid feature: "responseMode" must be "json", "text", or "binary"');
}

export function validateFeatureDefinition(value: unknown): FeatureDefinition {
  if (!isRecord(value)) {
    throw new Error("feature-call invalid feature: feature must be a JSON object");
  }

  const feature: FeatureDefinition = {
    method: assertMethodField(value.method),
    url: assertStringField(value.url, "url"),
    requestMode: assertRequestModeField(value.requestMode),
    responseMode: assertResponseModeField(value.responseMode),
    encryptBody: assertBooleanField(value.encryptBody, "encryptBody"),
    decryptResponse: assertBooleanField(value.decryptResponse, "decryptResponse"),
  };

  if (typeof value.id === "string" && value.id !== "") {
    feature.id = value.id;
  }
  if (typeof value.name === "string" && value.name !== "") {
    feature.name = value.name;
  }
  if (typeof value.description === "string" && value.description !== "") {
    feature.description = value.description;
  }
  if (typeof value.useOriginalName === "boolean") {
    feature.useOriginalName = value.useOriginalName;
  }

  return feature;
}

function tryDecryptBody(authoritySecret: string, body: string): string | undefined {
  try {
    return sm4DecryptEcb(authoritySecret.slice(0, 32), body);
  } catch {
    return undefined;
  }
}

function parseJsonIfPossible(value: string | undefined): unknown {
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function buildRequestBody(authoritySecret: string, feature: FeatureDefinition, plainBody: string): string {
  if (!feature.encryptBody) {
    return plainBody;
  }
  return JSON.stringify({
    secretMsg: sm4EncryptEcb(authoritySecret.slice(0, 32), plainBody),
  });
}

export async function executeFeatureCall(reqInf: BaseReqInf, input: FeatureCallInput): Promise<FeatureCallResult> {
  const feature = validateFeatureDefinition(input.feature);
  const { queryParams, filePath, outputPath } = input;
  const requestMode = feature.requestMode;
  const responseMode = feature.responseMode;
  const url = feature.url;

  if (requestMode === "upload") {
    const resolvedFilePath = filePath;
    if (!resolvedFilePath) {
      throw new Error("feature-call missing filePath for upload request");
    }
    const result =
      feature.useOriginalName || input.useOriginalName
        ? await XftOpenApiReqClient.doFileUploadByFileWithOriginalName(reqInf, url, queryParams, resolvedFilePath)
        : await XftOpenApiReqClient.doFileUploadByFileReq(reqInf, url, queryParams, resolvedFilePath);
    return {
      feature,
      requestMode,
      responseMode,
      filePath: resolvedFilePath,
      ...result,
    };
  }

  const plainBody = requestMode === "none" ? "{}" : input.bodyText ?? "{}";
  const requestBody = buildRequestBody(reqInf.authoritySecret, feature, plainBody);

  if (responseMode === "binary") {
    const resolvedOutputPath = outputPath;
    if (!resolvedOutputPath) {
      throw new Error("feature-call missing outputPath for binary response");
    }
    if (feature.method === "GET") {
      await XftOpenApiReqClient.downloadGetFileToPath(reqInf, url, queryParams, resolvedOutputPath);
    } else if (feature.method === "POST") {
      await XftOpenApiReqClient.downloadPostFileToPath(reqInf, url, queryParams, requestBody, resolvedOutputPath);
    } else {
      throw new Error(`unsupported feature method: ${feature.method}`);
    }
    return {
      feature,
      requestMode,
      responseMode,
      plainBody,
      requestBody,
      outputPath: resolvedOutputPath,
      fileName: basename(resolvedOutputPath),
    };
  }

  let result;
  if (feature.method === "GET") {
    result = await XftOpenApiReqClient.doCommonGetReq(reqInf, url, queryParams);
  } else if (feature.method === "POST") {
    result = await XftOpenApiReqClient.doCommonPostReq(reqInf, url, queryParams, requestBody);
  } else {
    throw new Error(`unsupported feature method: ${feature.method}`);
  }

  const decryptedBody = feature.decryptResponse ? tryDecryptBody(reqInf.authoritySecret, result.body) : undefined;
  return {
    feature,
    requestMode,
    responseMode,
    plainBody,
    requestBody,
    ...result,
    decryptedBody,
    parsedDecryptedBody: parseJsonIfPossible(decryptedBody),
  };
}
