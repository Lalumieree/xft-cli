package com.cmb.xft.open.api;

import org.bouncycastle.crypto.digests.SM3Digest;
import org.bouncycastle.util.encoders.Hex;

public class SM3Utils {
    /**
     * SM3摘要计算
     */
    public static String sm3Signature2 (String src) {
        try {
            SM3Digest sm3Digest = new SM3Digest();
            sm3Digest.update(src.getBytes("UTF-8"), 0, src.getBytes("UTF-8").length);
            byte[] ret = new byte[sm3Digest.getDigestSize()];
            sm3Digest.doFinal(ret, 0);
            return Hex.toHexString(ret);
        } catch (Exception e) {
            throw new RuntimeException("签名计算出现异常");
        }
    }
}
