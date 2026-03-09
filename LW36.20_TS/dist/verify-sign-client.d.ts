import type { BaseReqInf, PortalLoginInfo } from "./types.js";
export declare class XftVerifySignClient {
    private readonly baseReqInf;
    private readonly url;
    private validMinute;
    constructor(baseReqInf: BaseReqInf, url: string);
    setValidMinute(validMinute: number): void;
    verifySign(data: string, sign: string): Promise<PortalLoginInfo>;
}
