import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { sm2 } from "sm-crypto";

function sm3Binary(data: Buffer): Buffer {
  return execFileSync("openssl", ["dgst", "-sm3", "-binary"], { input: data });
}

export function sm3Hex(value: string): string {
  return sm3Binary(Buffer.from(value, "utf8")).toString("hex");
}

export function sm4EncryptEcb(hexKey: string, plaintext: string): string {
  return execFileSync("openssl", ["enc", "-sm4-ecb", "-nosalt", "-K", hexKey], {
    input: Buffer.from(plaintext, "utf8"),
  }).toString("hex");
}

export function sm4DecryptEcb(hexKey: string, ciphertextHex: string): string {
  return execFileSync("openssl", ["enc", "-d", "-sm4-ecb", "-nosalt", "-K", hexKey], {
    input: Buffer.from(ciphertextHex, "hex"),
  }).toString("utf8");
}

export function sm3WithSm2Signature(privateKeyHex: string, message: string): string {
  const publicKey = sm2.getPublicKeyFromPrivateKey(privateKeyHex);
  return sm2.doSignature(message, privateKeyHex, {
    hash: true,
    publicKey,
    der: false,
    userId: "1234567812345678",
  });
}

export function buildSha256JumpSign(dataStr: string, authoritySecret: string): string {
  return createHash("sha256")
    .update(`${dataStr}&${authoritySecret}`, "utf8")
    .digest("base64");
}
