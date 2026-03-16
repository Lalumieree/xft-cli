import type { BaseReqInf, LoginTokenInfo, TokenLoginInfo } from "./types.js";
export declare function getDataParamMap(dataStr: string): Record<string, string>;
export declare class XftVerifyTokenClient {
    private readonly baseReqInf;
    private readonly accessTokenUrl;
    private readonly loginUserUrl?;
    constructor(baseReqInf: BaseReqInf, accessTokenUrl: string, loginUserUrl?: string | undefined);
    verifyToken(data: string, sign: string): Promise<LoginTokenInfo>;
    getLoginInfo(data: string, sign: string): Promise<TokenLoginInfo>;
}
