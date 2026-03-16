import { writeFile } from "node:fs/promises";
import { Constants } from "./constants.js";
import { sm3Hex, sm3WithSm2Signature } from "./crypto.js";
import { sendBinaryRequest, sendTextRequest, uploadFileRequest } from "./http.js";
function hasText(value) {
    return value !== undefined && value !== null && value !== "";
}
export class XftOpenApiReqClient {
    static getSignInf(reqInf, url, queryParam) {
        const currentTimeMillis = Date.now();
        const timestamp = String(Math.floor(currentTimeMillis / 1000));
        const params = [["CSCAPPUID", reqInf.appId]];
        if (hasText(reqInf.companyId)) {
            params.push(["CSCPRJCOD", reqInf.companyId]);
        }
        if (hasText(reqInf.usrNbr)) {
            params.push(["CSCUSRNBR", reqInf.usrNbr]);
        }
        if (hasText(reqInf.usrUid)) {
            params.push(["CSCUSRUID", reqInf.usrUid]);
        }
        if (hasText(reqInf.edsCompanyId)) {
            params.push(["EDSPRJCOD", reqInf.companyId ?? reqInf.edsCompanyId]);
        }
        params.push(["CSCREQTIM", String(currentTimeMillis)]);
        if (queryParam) {
            for (const [key, value] of Object.entries(queryParam)) {
                if (value !== undefined && value !== null) {
                    params.push([key, String(value)]);
                }
            }
        }
        const parsed = new URL(url);
        const query = params.map(([key, value]) => `${key}=${value}`).join("&");
        const signedUrl = `${parsed.origin}${parsed.pathname}?${query}`;
        const path = `${parsed.pathname}?${query}`;
        return { timestamp, url: signedUrl, path };
    }
    static buildCommonHeaders(reqInf, signInf, apisign, digest) {
        return {
            Accept: "application/json,text/xml,text/javascript",
            "Content-Type": "application/json; charset=utf-8",
            "XFT-API-Call-Type": Constants.API_TYPE_JAVA,
            "XFT-API-SDK-Version": Constants.API_SDK_VERSION,
            "XFT-API-Scene": Constants.API_SCENE_CUST,
            appid: reqInf.appId,
            "x-alb-timestamp": signInf.timestamp,
            apisign,
            "x-alb-verify": "sm3withsm2",
            ...(digest ? { "x-alb-digest": digest } : {}),
        };
    }
    static async doCommonPostReq(reqInf, url, queryParam, requestBody) {
        const signInf = this.getSignInf(reqInf, url, queryParam);
        const digest = sm3Hex(requestBody);
        const signStr = `POST ${signInf.path}\nx-alb-digest: ${requestBody}\nx-alb-timestamp: ${signInf.timestamp}`;
        const apisign = sm3WithSm2Signature(reqInf.authoritySecret, signStr);
        const headers = this.buildCommonHeaders(reqInf, signInf, apisign, digest);
        return sendTextRequest("POST", signInf.url, headers, requestBody, reqInfTimeout(reqInf));
    }
    static async doCommonGetReq(reqInf, url, queryParam) {
        const signInf = this.getSignInf(reqInf, url, queryParam);
        const signStr = `GET ${signInf.path}\nx-alb-timestamp: ${signInf.timestamp}`;
        const apisign = sm3WithSm2Signature(reqInf.authoritySecret, signStr);
        const headers = this.buildCommonHeaders(reqInf, signInf, apisign);
        return sendTextRequest("GET", signInf.url, headers, undefined, reqInfTimeout(reqInf));
    }
    static async doFileUploadByFileReq(reqInf, url, queryParam, filePath) {
        return this.doFileUpload(reqInf, url, queryParam, filePath, false);
    }
    static async doFileUploadByFileWithOriginalName(reqInf, url, queryParam, filePath) {
        return this.doFileUpload(reqInf, url, queryParam, filePath, true);
    }
    static async doFileUpload(reqInf, url, queryParam, filePath, useOriginalName) {
        const signInf = this.getSignInf(reqInf, url, queryParam);
        const signStr = `POST ${signInf.path}\nx-alb-timestamp: ${signInf.timestamp}`;
        const apisign = sm3WithSm2Signature(reqInf.authoritySecret, signStr);
        const headers = {
            Accept: "application/json,text/xml,text/javascript",
            "XFT-API-Call-Type": Constants.API_TYPE_JAVA,
            "XFT-API-SDK-Version": Constants.API_SDK_VERSION,
            "XFT-API-Scene": Constants.API_SCENE_CUST,
            appid: reqInf.appId,
            "x-alb-timestamp": signInf.timestamp,
            apisign,
            "x-alb-verify": "sm3withsm2",
        };
        return uploadFileRequest(signInf.url, headers, filePath, useOriginalName, reqInfTimeout(reqInf));
    }
    static async doGetFileDownloadReq(reqInf, url, queryParam) {
        const signInf = this.getSignInf(reqInf, url, queryParam);
        const signStr = `GET ${signInf.path}\nx-alb-timestamp: ${signInf.timestamp}`;
        const apisign = sm3WithSm2Signature(reqInf.authoritySecret, signStr);
        const headers = this.buildCommonHeaders(reqInf, signInf, apisign);
        return (await sendBinaryRequest("GET", signInf.url, headers, undefined, reqInfTimeout(reqInf))).response;
    }
    static async doPostFileDownloadReq(reqInf, url, queryParam, requestBody) {
        const signInf = this.getSignInf(reqInf, url, queryParam);
        const digest = sm3Hex(requestBody);
        const signStr = `POST ${signInf.path}\nx-alb-digest: ${requestBody}\nx-alb-timestamp: ${signInf.timestamp}`;
        const apisign = sm3WithSm2Signature(reqInf.authoritySecret, signStr);
        const headers = this.buildCommonHeaders(reqInf, signInf, apisign, digest);
        return (await sendBinaryRequest("POST", signInf.url, headers, requestBody, reqInfTimeout(reqInf))).response;
    }
    static async downloadGetFileToPath(reqInf, url, queryParam, outputPath) {
        const signInf = this.getSignInf(reqInf, url, queryParam);
        const signStr = `GET ${signInf.path}\nx-alb-timestamp: ${signInf.timestamp}`;
        const apisign = sm3WithSm2Signature(reqInf.authoritySecret, signStr);
        const headers = this.buildCommonHeaders(reqInf, signInf, apisign);
        const { bytes } = await sendBinaryRequest("GET", signInf.url, headers, undefined, reqInfTimeout(reqInf));
        await writeFile(outputPath, bytes);
    }
    static async downloadPostFileToPath(reqInf, url, queryParam, requestBody, outputPath) {
        const signInf = this.getSignInf(reqInf, url, queryParam);
        const digest = sm3Hex(requestBody);
        const signStr = `POST ${signInf.path}\nx-alb-digest: ${requestBody}\nx-alb-timestamp: ${signInf.timestamp}`;
        const apisign = sm3WithSm2Signature(reqInf.authoritySecret, signStr);
        const headers = this.buildCommonHeaders(reqInf, signInf, apisign, digest);
        const { bytes } = await sendBinaryRequest("POST", signInf.url, headers, requestBody, reqInfTimeout(reqInf));
        await writeFile(outputPath, bytes);
    }
}
function reqInfTimeout(_reqInf) {
    return 120000;
}
