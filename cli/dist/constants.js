export class XftSignException extends Error {
    errorCode;
    errorMessage;
    constructor(errorCode, errorMessage) {
        super(errorMessage);
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
        this.name = "XftSignException";
    }
    toString() {
        return `XftSignException异常:错误码:${this.errorCode},错误信息:${this.errorMessage}`;
    }
}
export const Constants = {
    API_TYPE_JAVA: "sdk-java",
    API_SDK_VERSION: "2.0.3-RELEASE",
    API_SCENE_CUST: "cust",
    CHARSET_UTF8: "UTF-8",
    CHARSET_ISO: "ISO-8859-1",
    METHOD_POST: "POST",
    METHOD_GET: "GET",
    METHOD_PUT: "PUT",
    CONNECT_TIMEOUT: 15000,
    READ_TIMEOUT: 30000,
    RESPONSE_TYPE_STRING: "STRING",
    RESPONSE_TYPE_BYTE: "BYTE",
    DATA_SPLIT_SYMBOL: "|",
    EQUAL_SYMBOL: "=",
    SYCOMRETZ: "SYCOMRETZ",
    SUCCESS_CODE: "SUC0000",
    ERROR_DATA_TOKEN_NOT_EXIST: new XftSignException("XFT00006", "data不带有token"),
    ERROR_SIGN_EXPIRED: new XftSignException("XFT00001", "签名已过期"),
    ERROR_VERIFY_EXCEPTION: new XftSignException("XFT00002", "验签发生异常"),
    ERROR_DATA_ERROR: new XftSignException("XFT00003", "data格式不正确"),
    ERROR_SIGN_ERROR: new XftSignException("XFT00007", "sign格式不正确"),
    ERROR_APP_SECRET_ERROR: new XftSignException("XFT00004", "appSecret不正确"),
    ERROR_SINGN_INCORRECT: new XftSignException("XFT00005", "签名不正确"),
    ERROR_CHANGE_TOKEN: new XftSignException("XFT00007", "获取accessToken失败"),
    ERROR_LOGIN_USER: new XftSignException("XFT00008", "获取登录信息失败"),
};
