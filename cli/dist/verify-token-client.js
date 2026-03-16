import { Constants, XftSignException } from "./constants.js";
import { sm4DecryptEcb, sm4EncryptEcb, buildSha256JumpSign } from "./crypto.js";
import { XftOpenApiReqClient } from "./open-api-client.js";
function decodeBase64Data(data) {
    const candidates = [decodeURIComponentSafe(data), data];
    for (const candidate of candidates) {
        try {
            return Buffer.from(padBase64(candidate), "base64").toString("utf8");
        }
        catch {
            continue;
        }
    }
    throw Constants.ERROR_DATA_ERROR;
}
function decodeURIComponentSafe(value) {
    try {
        return decodeURIComponent(value);
    }
    catch {
        return value;
    }
}
function padBase64(value) {
    const mod = value.length % 4;
    return mod === 0 ? value : `${value}${"=".repeat(4 - mod)}`;
}
export function getDataParamMap(dataStr) {
    const result = {};
    for (const item of dataStr.split(Constants.DATA_SPLIT_SYMBOL)) {
        const index = item.indexOf(Constants.EQUAL_SYMBOL);
        if (index > 0) {
            result[item.slice(0, index)] = item.slice(index + 1);
        }
    }
    return result;
}
function verifyDataAndSign(dataStr, sign, authoritySecret) {
    const signal = buildSha256JumpSign(dataStr, authoritySecret);
    const decodedSign = decodeURIComponentSafe(sign);
    if (sign !== signal && decodedSign !== signal) {
        throw Constants.ERROR_SIGN_ERROR;
    }
}
function parseFrameworkResponse(responseBody) {
    return JSON.parse(responseBody);
}
export class XftVerifyTokenClient {
    baseReqInf;
    accessTokenUrl;
    loginUserUrl;
    constructor(baseReqInf, accessTokenUrl, loginUserUrl) {
        this.baseReqInf = baseReqInf;
        this.accessTokenUrl = accessTokenUrl;
        this.loginUserUrl = loginUserUrl;
    }
    async verifyToken(data, sign) {
        const dataStr = decodeBase64Data(data);
        const dataMap = getDataParamMap(dataStr);
        verifyDataAndSign(dataStr, sign, this.baseReqInf.authoritySecret);
        const token = dataMap.TKNNBR;
        if (!token) {
            throw Constants.ERROR_DATA_TOKEN_NOT_EXIST;
        }
        const body = JSON.stringify({ token, appId: this.baseReqInf.appId });
        const requestBody = JSON.stringify({
            secretMsg: sm4EncryptEcb(this.baseReqInf.authoritySecret.slice(0, 32), body),
        });
        const reqInf = { ...this.baseReqInf };
        if (reqInf.whrService) {
            reqInf.companyId = dataMap.enterpriseId ?? "TEMP0000";
        }
        const response = await XftOpenApiReqClient.doCommonPostReq(reqInf, this.accessTokenUrl, undefined, requestBody);
        if (response.httpStatusCode !== 200) {
            throw Constants.ERROR_CHANGE_TOKEN;
        }
        const responseBody = sm4DecryptEcb(this.baseReqInf.authoritySecret.slice(0, 32), response.body);
        const framework = parseFrameworkResponse(responseBody);
        if (framework.returnCode !== Constants.SUCCESS_CODE) {
            throw new XftSignException(framework.returnCode, framework.errorMsg ?? "未知错误");
        }
        return framework.body;
    }
    async getLoginInfo(data, sign) {
        if (!this.loginUserUrl) {
            throw Constants.ERROR_LOGIN_USER;
        }
        const loginTokenInfo = await this.verifyToken(data, sign);
        const reqInf = {
            ...this.baseReqInf,
            companyId: loginTokenInfo.enterpriseId,
            usrNbr: loginTokenInfo.enterpriseUserId,
            usrUid: loginTokenInfo.accountId,
        };
        const body = JSON.stringify({ token: loginTokenInfo.token });
        const requestBody = JSON.stringify({
            secretMsg: sm4EncryptEcb(this.baseReqInf.authoritySecret.slice(0, 32), body),
        });
        const response = await XftOpenApiReqClient.doCommonPostReq(reqInf, this.loginUserUrl, undefined, requestBody);
        if (response.httpStatusCode !== 200) {
            throw Constants.ERROR_LOGIN_USER;
        }
        const responseBody = sm4DecryptEcb(this.baseReqInf.authoritySecret.slice(0, 32), response.body);
        const framework = parseFrameworkResponse(responseBody);
        if (framework.returnCode !== Constants.SUCCESS_CODE) {
            throw new XftSignException(framework.returnCode, framework.errorMsg ?? "未知错误");
        }
        return framework.body;
    }
}
