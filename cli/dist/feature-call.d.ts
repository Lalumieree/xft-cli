import type { BaseReqInf, FeatureCallInput, FeatureCallResult, FeatureDefinition } from "./types.js";
export declare function validateFeatureDefinition(value: unknown): FeatureDefinition;
export declare function executeFeatureCall(reqInf: BaseReqInf, input: FeatureCallInput): Promise<FeatureCallResult>;
