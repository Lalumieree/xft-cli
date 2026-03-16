import { Constants, XftSignException } from "./constants.js";
import { buildSha256JumpSign, sm4DecryptEcb, sm4EncryptEcb } from "./crypto.js";
import { XftOpenApiReqClient } from "./open-api-client.js";
import { getDataParamMap } from "./verify-token-client.js";
function decodeData(data) {
    const values = [safeDecodeURIComponent(data), data];
    for (const value of values) {
        try {
            return Buffer.from(padBase64(value), "base64").toString("utf8");
        }
        catch {
            continue;
        }
    }
    throw Constants.ERROR_DATA_ERROR;
}
function padBase64(value) {
    const mod = value.length % 4;
    return mod === 0 ? value : `${value}${"=".repeat(4 - mod)}`;
}
function safeDecodeURIComponent(value) {
    try {
        return decodeURIComponent(value);
    }
    catch {
        return value;
    }
}
function verifySignValue(dataStr, sign, authoritySecret) {
    const signal = buildSha256JumpSign(dataStr, authoritySecret);
    if (sign !== signal && safeDecodeURIComponent(sign) !== signal) {
        throw Constants.ERROR_SIGN_ERROR;
    }
}
function isInValidTime(reqTime, validMinute) {
    if (!reqTime) {
        return false;
    }
    return Number(reqTime) >= Date.now() - validMinute * 60 * 1000;
}
function parseLoginInfo(body) {
    const parsed = JSON.parse(body);
    const returnBlock = Array.isArray(parsed[Constants.SYCOMRETZ]) ? parsed[Constants.SYCOMRETZ] : [];
    const errCode = returnBlock[0]?.ERRCOD?.toString() ?? "0000000";
    const errMsg = returnBlock[0]?.ERRMSG?.toString() ?? "0000000";
    if (errCode !== "0000000") {
        throw new XftSignException(errCode, errMsg);
    }
    const loginUserInfo = Array.isArray(parsed.OPUSINFOY) ? parsed.OPUSINFOY[0] : {};
    const opUsrInfo = Array.isArray(parsed.OPUSRINFY) ? parsed.OPUSRINFY[0] : undefined;
    if (opUsrInfo) {
        loginUserInfo.COPUID = opUsrInfo.COPUID?.toString();
        loginUserInfo.COPUNM = opUsrInfo.COPUNM?.toString();
    }
    const prjInfoList = Array.isArray(parsed.OPPRJINFY) ? parsed.OPPRJINFY : undefined;
    if (prjInfoList?.length && !loginUserInfo.USRUID) {
        loginUserInfo.USRUID = prjInfoList[0]?.USRUID;
    }
    return {
        loginUserInfo,
        prjInfoList,
    };
}
export class XftVerifySignClient {
    baseReqInf;
    url;
    validMinute = 5;
    constructor(baseReqInf, url) {
        this.baseReqInf = baseReqInf;
        this.url = url;
    }
    setValidMinute(validMinute) {
        this.validMinute = validMinute;
    }
    async verifySign(data, sign) {
        const dataStr = decodeData(data);
        const dataMap = getDataParamMap(dataStr);
        if (!isInValidTime(dataMap.REQTIM, this.validMinute)) {
            throw Constants.ERROR_SIGN_EXPIRED;
        }
        verifySignValue(dataStr, sign, this.baseReqInf.authoritySecret);
        const jsonBody = JSON.stringify({
            SYCOMOPAY: [
                {
                    SESTKN: dataMap.TKNNBR,
                    OPAUID: this.baseReqInf.appId,
                },
            ],
        });
        const requestBody = JSON.stringify({
            secretMsg: sm4EncryptEcb(this.baseReqInf.authoritySecret.slice(0, 32), jsonBody),
        });
        const response = await XftOpenApiReqClient.doCommonPostReq(this.baseReqInf, this.url, undefined, requestBody);
        const responseBody = sm4DecryptEcb(this.baseReqInf.authoritySecret.slice(0, 32), response.body);
        return parseLoginInfo(responseBody);
    }
}
