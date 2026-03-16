export declare function sm3Hex(value: string): string;
export declare function sm4EncryptEcb(hexKey: string, plaintext: string): string;
export declare function sm4DecryptEcb(hexKey: string, ciphertextHex: string): string;
export declare function sm3WithSm2Signature(privateKeyHex: string, message: string): string;
export declare function buildSha256JumpSign(dataStr: string, authoritySecret: string): string;
