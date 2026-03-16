import type { BaseReqInf, HttpResponseData, QueryParams, SignInf } from "./types.js";
export declare class XftOpenApiReqClient {
    static getSignInf(reqInf: BaseReqInf, url: string, queryParam?: QueryParams): SignInf;
    private static buildCommonHeaders;
    static doCommonPostReq(reqInf: BaseReqInf, url: string, queryParam: QueryParams | undefined, requestBody: string): Promise<HttpResponseData>;
    static doCommonGetReq(reqInf: BaseReqInf, url: string, queryParam?: QueryParams): Promise<HttpResponseData>;
    static doFileUploadByFileReq(reqInf: BaseReqInf, url: string, queryParam: QueryParams | undefined, filePath: string): Promise<HttpResponseData>;
    static doFileUploadByFileWithOriginalName(reqInf: BaseReqInf, url: string, queryParam: QueryParams | undefined, filePath: string): Promise<HttpResponseData>;
    private static doFileUpload;
    static doGetFileDownloadReq(reqInf: BaseReqInf, url: string, queryParam: QueryParams | undefined): Promise<HttpResponseData>;
    static doPostFileDownloadReq(reqInf: BaseReqInf, url: string, queryParam: QueryParams | undefined, requestBody: string): Promise<HttpResponseData>;
    static downloadGetFileToPath(reqInf: BaseReqInf, url: string, queryParam: QueryParams | undefined, outputPath: string): Promise<void>;
    static downloadPostFileToPath(reqInf: BaseReqInf, url: string, queryParam: QueryParams | undefined, requestBody: string, outputPath: string): Promise<void>;
}
