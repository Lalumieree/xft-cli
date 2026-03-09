import { createHash } from "node:crypto";
import {
  sm4DecryptEcb,
  sm4EncryptEcb,
  sm3WithSm2Signature,
  XftVerifySignClient,
  XftVerifyTokenClient,
} from "../dist/index.js";

function decodeData(data) {
  const decoded = decodeURIComponent(data);
  return Buffer.from(decoded, "base64").toString("utf8");
}

function buildJumpSign(dataStr, authoritySecret) {
  return createHash("sha256").update(`${dataStr}&${authoritySecret}`, "utf8").digest("base64");
}

async function run() {
  const results = [];

  try {
    const key = "009b523f629bbd8fba7ead9887d6eba2";
    const body =
      "c03f4fb0dc85a9da73589739092950217f25e10aff3fcbb4deb1aa9e61ffc80a53aca37bd8a29af37566bbbc298d9cdeba50b9eda15e52c05b85306ff2dff03ac6e1d0e1ee6cb3898ab9c5c3f2a6ccca";
    const plain = sm4DecryptEcb(key, body);
    results.push({ test: "sm4 decrypt sample", ok: true, plain });
  } catch (error) {
    results.push({ test: "sm4 decrypt sample", ok: false, error: String(error) });
  }

  try {
    const secret = "0123456789abcdeffedcba98765432100123456789abcdeffedcba9876543210";
    const source = JSON.stringify({ hello: "world" });
    const encrypted = sm4EncryptEcb(secret.slice(0, 32), source);
    const plain = sm4DecryptEcb(secret.slice(0, 32), encrypted);
    results.push({ test: "sm4 roundtrip", ok: plain === source, encrypted, plain });
  } catch (error) {
    results.push({ test: "sm4 roundtrip", ok: false, error: String(error) });
  }

  try {
    const appSecret = "2ca146a46e8b130231f0cc3a082a359e5e3e9dbb34b8d74d82ef0063031b917c";
    const data =
      "VEtOTkJSPUNTQy02NjkwODI5MjIyMTMtSXIxWFQ1OEdTWFd6ZmdjWlVWWnVEWHc0ekxWenAwT2o5cUcyYnRNb1RtR0tVNHdDQzh8UkVRVElNPTE3MDU2NDQ1MTM5MzJ8T1BBVUlEPTMwMjdiZTc2LTg1NTgtNDkwNS04ZmFmLWIzYTcyMTUyZWMwZg%3D%3D";
    const sign = "NOQyr4DVUFYayi0QJ7P1nIDtvrajIJRaDWMlj8mbtVQ%3D";
    const dataStr = decodeData(data);
    const expected = buildJumpSign(dataStr, appSecret);
    results.push({ test: "jump sign local verify", ok: expected === decodeURIComponent(sign), expected });
  } catch (error) {
    results.push({ test: "jump sign local verify", ok: false, error: String(error) });
  }

  try {
    const apisign = sm3WithSm2Signature(
      "3ddf941ee9e8c4bdc95fc948422d4c905cfcbd4d5cf92c9383aca9176f5a104e",
      "POST /common/api/common/common/OPSYTKLG?CSCAPPUID=9f31f235-33c7-4c11-8cc1-11545680dbab&CSCPRJCOD=XFV91013&CSCREQTIM=1676982018679&CSCUSRNBR=U0000&CSCUSRUID=10283987\nx-alb-digest: {}\nx-alb-timestamp: 1676982018",
    );
    results.push({ test: "sm2 sign format", ok: apisign.length === 128, apisignLength: apisign.length });
  } catch (error) {
    results.push({ test: "sm2 sign format", ok: false, error: String(error) });
  }

  try {
    const companyId = "XFA23501";
    const appId = "3027be76-8558-4905-8faf-b3a72152ec0f";
    const authoritySecret = "2ca146a46e8b130231f0cc3a082a359e5e3e9dbb34b8d74d82ef0063031b917c";
    const data =
      "VEtOTkJSPUNTQy0xODY0NTQ2NDc0MDMtNXlFZWF2Uks5ZE83T3JVQzRXQU5xWURFR0E2N0d2NUV6Zzg0RzZNRmROeE14eXZlRkp8UkVRVElNPTE3MDU2NTI1NjE0MTR8T1BBVUlEPTMwMjdiZTc2LTg1NTgtNDkwNS04ZmFmLWIzYTcyMTUyZWMwZg%3D%3D";
    const sign = "A3c9f3fxEmn7S55WoiIzJ0lzw9gOG5PAH%2BM0DwqRqSo%3D";
    const client = new XftVerifySignClient({ companyId, appId, authoritySecret }, "https://api.cmburl.cn:8065/portal/common/common/OPSYTKLG");
    const loginInfo = await client.verifySign(data, sign);
    results.push({ test: "verify sign online", ok: true, loginInfo });
  } catch (error) {
    results.push({ test: "verify sign online", ok: false, error: String(error) });
  }

  try {
    const appId = "a8dbd9bd-50e5-4b9a-a057-1d2b47fee233";
    const authoritySecret = "2c7340e49f368445de408bd669e6a812c669cb1ab50dda24852d36d62ad9db36";
    const data =
      "VEtOTkJSPUNTQy01NzY3OTg4MjMyNDAtOUhPUmxMcTBsbElwRnpzR3h0cmlWTlYwa0lCcGZ1Y2FENkpOaDd2SWpxRUxJQnJWa0x8UkVRVElNPTE3MDM4MzAxMTUwOTd8T1BBVUlEPWI3NzczYjRjLWViN2UtNDI1OC05MmM4LWY1M2ZmMjQ5OTE4Zg%3D%3D";
    const sign = "niSXtZLZw1k16fyDmzrjIFzzXc7z663vXCK46nsF%2FCg%3D";
    const client = new XftVerifyTokenClient(
      { appId, authoritySecret },
      "https://api.cmburl.cn:8065/portal/common/uat2/xft-login-new/v1/access_token",
    );
    const tokenInfo = await client.verifyToken(data, sign);
    results.push({ test: "verify token online", ok: true, tokenInfo });
  } catch (error) {
    results.push({ test: "verify token online", ok: false, error: String(error) });
  }

  console.log(JSON.stringify(results, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
