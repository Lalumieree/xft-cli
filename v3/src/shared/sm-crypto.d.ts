declare module "sm-crypto" {
  const smCrypto: {
    sm4: {
      encrypt(plainText: string, keyHex: string, options?: Record<string, unknown>): string;
      decrypt(cipherHex: string, keyHex: string, options?: Record<string, unknown>): string;
    };
  };

  export default smCrypto;
}
