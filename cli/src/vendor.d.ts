declare module "sm-crypto" {
  export const sm2: {
    doSignature(
      msg: string | Uint8Array,
      privateKey: string,
      options?: {
        pointPool?: unknown[];
        der?: boolean;
        hash?: boolean;
        publicKey?: string;
        userId?: string;
      },
    ): string;
    getPublicKeyFromPrivateKey(privateKey: string): string;
  };
}
