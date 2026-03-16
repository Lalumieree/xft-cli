import type { HttpResponseData } from "./types.js";
export declare function sendTextRequest(method: string, url: string, headers: Record<string, string>, body?: string, timeoutMs?: number): Promise<HttpResponseData>;
export declare function sendBinaryRequest(method: string, url: string, headers: Record<string, string>, body?: string, timeoutMs?: number): Promise<{
    response: HttpResponseData;
    bytes: Uint8Array;
}>;
export declare function uploadFileRequest(url: string, headers: Record<string, string>, filePath: string, useOriginalName: boolean, timeoutMs?: number): Promise<HttpResponseData>;
