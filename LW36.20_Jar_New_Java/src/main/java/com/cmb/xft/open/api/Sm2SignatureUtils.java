package com.cmb.xft.open.api;

import org.bouncycastle.asn1.ASN1InputStream;
import org.bouncycastle.asn1.ASN1Integer;
import org.bouncycastle.asn1.ASN1Sequence;
import org.bouncycastle.crypto.CryptoException;
import org.bouncycastle.crypto.params.ECDomainParameters;
import org.bouncycastle.crypto.params.ECPrivateKeyParameters;
import org.bouncycastle.crypto.params.ParametersWithID;
import org.bouncycastle.crypto.signers.SM2Signer;
import org.bouncycastle.jce.ECNamedCurveTable;
import org.bouncycastle.jce.spec.ECParameterSpec;
import org.bouncycastle.util.encoders.Hex;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigInteger;
import java.net.URLDecoder;
import java.util.*;

/**
 * @Author:yyf
 * @Descriptions:
 */
public class Sm2SignatureUtils {

    /**
     * SM2私钥签名
     */
    protected static String sm3withsm2Signature(String privateKeyStr, String dataStr) throws CryptoException, IOException {
        byte[] key = Hex.decode(privateKeyStr);
        byte[] data = dataStr.getBytes(Constants.CHARSET_UTF8);

        // 获得一条签名曲线
        ECParameterSpec spec = ECNamedCurveTable.getParameterSpec("sm2p256v1");
        // 构造domain函数
        ECDomainParameters domainParameters = new ECDomainParameters(spec.getCurve(), spec.getG(), spec.getN(), spec.getH(), spec.getSeed());

        // 国密要求，ID默认值为1234567812345678
        ECPrivateKeyParameters privateKey = new ECPrivateKeyParameters(new BigInteger(1, key), domainParameters);
        ParametersWithID parameters = new ParametersWithID(privateKey, "1234567812345678".getBytes());
        // 初始化签名实例
        SM2Signer signer = new SM2Signer();
        signer.init(true, parameters);
        signer.update(data, 0, data.length);

        return Hex.toHexString(decodeDERSignature(signer.generateSignature()));
    }

    private static byte[] decodeDERSignature(byte[] signature) throws IOException {
        ASN1InputStream stream = new ASN1InputStream(new ByteArrayInputStream(signature));
        ASN1Sequence primitive = (ASN1Sequence) stream.readObject();
        Enumeration enumeration = primitive.getObjects();
        BigInteger R = ((ASN1Integer) enumeration.nextElement()).getValue();
        BigInteger S = ((ASN1Integer) enumeration.nextElement()).getValue();
        byte[] bytes = new byte[64];
        byte[] r = format(R.toByteArray());
        byte[] s = format(S.toByteArray());
        System.arraycopy(r, 0, bytes, 0, 32);
        System.arraycopy(s, 0, bytes, 32, 32);
        return bytes;
    }

    private static byte[] format(byte[] value) {
        if (value.length == 32) {
            return value;
        } else {
            byte[] bytes = new byte[32];
            if (value.length > 32) {
                System.arraycopy(value, value.length - 32, bytes, 0, 32);
            } else {
                System.arraycopy(value, 0, bytes, 32 - value.length, value.length);
            }

            return bytes;
        }
    }

}
