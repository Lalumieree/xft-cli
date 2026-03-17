import { basename } from "node:path";
import { sm4DecryptEcb, sm4EncryptEcb } from "./crypto.js";
import { XftOpenApiReqClient } from "./open-api-client.js";
import type { BaseReqInf, FeatureCallInput, FeatureCallResult, FeatureDefinition } from "./types.js";

function getFeatureRequestMode(feature: FeatureDefinition): "json" | "upload" | "none" {
  if (feature.requestMode === "upload") {
    return "upload";
  }
  if (feature.requestMode === "none") {
    return "none";
  }
  return "json";
}

function getFeatureResponseMode(feature: FeatureDefinition): "json" | "text" | "binary" {
  if (feature.responseMode === "binary") {
    return "binary";
  }
  if (feature.responseMode === "text") {
    return "text";
  }
  return "json";
}

function requireFeatureUrl(feature: FeatureDefinition): string {
  if (!feature.url) {
    throw new Error(`feature is missing url: ${feature.id ?? feature.name ?? "unknown"}`);
  }
  return feature.url;
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
  const { feature, queryParams, filePath, outputPath } = input;
  const requestMode = getFeatureRequestMode(feature);
  const responseMode = getFeatureResponseMode(feature);
  const url = requireFeatureUrl(feature);

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
