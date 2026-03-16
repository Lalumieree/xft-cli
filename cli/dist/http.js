import { readFile } from "node:fs/promises";
import { basename, parse } from "node:path";
function timeoutSignal(timeoutMs) {
    return AbortSignal.timeout(timeoutMs);
}
function normalizeHeaders(headers) {
    const result = {};
    headers.forEach((value, key) => {
        result[key] = value;
    });
    return result;
}
export async function sendTextRequest(method, url, headers, body, timeoutMs = 120000) {
    const response = await fetch(url, {
        method,
        headers,
        body,
        signal: timeoutSignal(timeoutMs),
    });
    return {
        body: await response.text(),
        httpStatusCode: response.status,
        headers: normalizeHeaders(response.headers),
    };
}
export async function sendBinaryRequest(method, url, headers, body, timeoutMs = 120000) {
    const result = await fetch(url, {
        method,
        headers,
        body,
        signal: timeoutSignal(timeoutMs),
    });
    const bytes = new Uint8Array(await result.arrayBuffer());
    return {
        response: {
            body: Buffer.from(bytes).toString("latin1"),
            httpStatusCode: result.status,
            headers: normalizeHeaders(result.headers),
        },
        bytes,
    };
}
export async function uploadFileRequest(url, headers, filePath, useOriginalName, timeoutMs = 120000) {
    const data = await readFile(filePath);
    if (data.byteLength > 20 * 1024 * 1024) {
        throw new Error("文件内容过大");
    }
    const fileName = useOriginalName ? basename(filePath) : parse(filePath).name;
    const form = new FormData();
    form.set("file", new Blob([data]), fileName);
    const response = await fetch(url, {
        method: "POST",
        headers,
        body: form,
        signal: timeoutSignal(timeoutMs),
    });
    return {
        body: await response.text(),
        httpStatusCode: response.status,
        headers: normalizeHeaders(response.headers),
    };
}
