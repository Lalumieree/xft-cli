export interface BaseReqInf {
    companyId?: string;
    edsCompanyId?: string;
    usrUid?: string;
    usrNbr?: string;
    appId: string;
    authoritySecret: string;
    whrService?: boolean;
}
export interface SignInf {
    timestamp: string;
    url: string;
    path: string;
}
export interface HttpResponseData {
    body: string;
    httpStatusCode: number;
    headers: Record<string, string>;
}
export type FeatureRequestMode = "json" | "upload" | "none";
export type FeatureResponseMode = "json" | "text" | "binary";
export interface FeatureDefinition {
    id?: string;
    name?: string;
    description?: string;
    method: "GET" | "POST";
    url: string;
    encryptBody: boolean;
    decryptResponse: boolean;
    requestMode: FeatureRequestMode;
    responseMode: FeatureResponseMode;
    useOriginalName?: boolean;
}
export interface FeatureCallInput {
    feature: FeatureDefinition;
    queryParams?: QueryParams;
    bodyText?: string;
    filePath?: string;
    outputPath?: string;
    useOriginalName?: boolean;
}
export interface FeatureCallResult extends Partial<HttpResponseData> {
    feature: FeatureDefinition;
    requestMode: FeatureRequestMode;
    responseMode: FeatureResponseMode;
    plainBody?: string;
    requestBody?: string;
    decryptedBody?: string;
    parsedDecryptedBody?: unknown;
    filePath?: string;
    outputPath?: string;
    fileName?: string;
}
export interface XftFrameworkResponse<T = unknown> {
    returnCode: string;
    errorMsg?: string;
    body: T;
}
export interface LoginUserInfo {
    AUTFLG?: string;
    ACSTKN?: string;
    EXPTIM?: number;
    PRJCOD?: string;
    PRJNAM?: string;
    USRNBR?: string;
    USRNAM?: string;
    KEYTYP?: string;
    KEYNBR?: string;
    USRSTS?: string;
    CLTNBR?: string;
    EMLADR?: string;
    MBLNBR?: string;
    USRFLG?: string;
    USRTYP?: string;
    SEATKN?: string;
    ORGSEQ?: string;
    STFSEQ?: string;
    STFNBR?: string;
    STFNAM?: string;
    SEXFLG?: string;
    COPUID?: string;
    COPUNM?: string;
    USRUID?: string;
}
export interface PrjInfo {
    PRJCOD?: string;
    PRJNAM?: string;
    USRUID?: string;
    USRNBR?: string;
    USRNAM?: string;
    ORGCOD?: string;
    USRSTS?: string;
    USRTYP?: string;
    PRJCUR?: string;
    ERRMSG?: string;
    SPRUSR?: string;
    AUTLVL?: string;
    AUTDAT?: string;
}
export interface PortalLoginInfo {
    loginUserInfo: LoginUserInfo;
    prjInfoList?: PrjInfo[];
}
export interface LoginSystemInfo {
    token?: string;
    expire?: number;
}
export interface LoginAccountInfo {
    accountStatus?: string;
    accountId?: string;
}
export interface LoginContactInfo {
    mobile?: string;
    email?: string;
}
export interface LoginCertificationInfo {
    certificationType?: string;
    certificationNumber?: string;
    name?: string;
}
export interface LoginEnterpriseInfo {
    enterpriseId?: string;
    enterpriseName?: string;
    enterpriseCreditCode?: string;
    enterpriseUserId?: string;
    userName?: string;
    userType?: string;
    userPost?: string;
    userOrgId?: string;
    userOrgName?: string;
}
export interface TokenLoginInfo {
    systemInfo?: LoginSystemInfo;
    accountInfo?: LoginAccountInfo;
    contactInfo?: LoginContactInfo;
    certificationInfo?: LoginCertificationInfo;
    enterpriseInfo?: LoginEnterpriseInfo;
}
export interface LoginTokenInfo {
    token?: string;
    expire?: number;
    accountId?: string;
    enterpriseId?: string;
    enterpriseUserId?: string;
}
export type QueryParams = Record<string, string | number | boolean | null | undefined>;
