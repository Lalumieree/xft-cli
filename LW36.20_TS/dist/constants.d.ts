export declare class XftSignException extends Error {
    errorCode: string;
    errorMessage: string;
    constructor(errorCode: string, errorMessage: string);
    toString(): string;
}
export declare const Constants: {
    readonly API_TYPE_JAVA: "sdk-java";
    readonly API_SDK_VERSION: "2.0.3-RELEASE";
    readonly API_SCENE_CUST: "cust";
    readonly CHARSET_UTF8: "UTF-8";
    readonly CHARSET_ISO: "ISO-8859-1";
    readonly METHOD_POST: "POST";
    readonly METHOD_GET: "GET";
    readonly METHOD_PUT: "PUT";
    readonly CONNECT_TIMEOUT: 15000;
    readonly READ_TIMEOUT: 30000;
    readonly RESPONSE_TYPE_STRING: "STRING";
    readonly RESPONSE_TYPE_BYTE: "BYTE";
    readonly DATA_SPLIT_SYMBOL: "|";
    readonly EQUAL_SYMBOL: "=";
    readonly SYCOMRETZ: "SYCOMRETZ";
    readonly SUCCESS_CODE: "SUC0000";
    readonly ERROR_DATA_TOKEN_NOT_EXIST: XftSignException;
    readonly ERROR_SIGN_EXPIRED: XftSignException;
    readonly ERROR_VERIFY_EXCEPTION: XftSignException;
    readonly ERROR_DATA_ERROR: XftSignException;
    readonly ERROR_SIGN_ERROR: XftSignException;
    readonly ERROR_APP_SECRET_ERROR: XftSignException;
    readonly ERROR_SINGN_INCORRECT: XftSignException;
    readonly ERROR_CHANGE_TOKEN: XftSignException;
    readonly ERROR_LOGIN_USER: XftSignException;
};
