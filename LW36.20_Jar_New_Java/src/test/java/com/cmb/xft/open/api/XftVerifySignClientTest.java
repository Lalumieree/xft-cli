package com.cmb.xft.open.api;


import com.cmb.xft.open.utils.Base64;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.BlockJUnit4ClassRunner;

import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

@RunWith(BlockJUnit4ClassRunner.class)
public class XftVerifySignClientTest {


    @Test
    public void testVerifySign_签名验证() throws Exception {
        String data =
                "VEtOTkJSPUNTQy0xODY0NTQ2NDc0MDMtNXlFZWF2Uks5ZE83T3JVQzRXQU5xWURFR0E2N0d2NUV6Zzg0RzZNRmROeE14eXZlRkp8UkVRVElNPTE3MDU2NTI1NjE0MTR8T1BBVUlEPTMwMjdiZTc2LTg1NTgtNDkwNS04ZmFmLWIzYTcyMTUyZWMwZg%3D%3D";
        String sign = "A3c9f3fxEmn7S55WoiIzJ0lzw9gOG5PAH%2BM0DwqRqSo%3D";


        /* 薪福通租户号 */
        String companyId = "XFA23501";
        /* 开放平台 appId*/
        String appId = "3027be76-8558-4905-8faf-b3a72152ec0f";
        /* 开放平台 authoritySecret*/
        String authoritySecret = "2ca146a46e8b130231f0cc3a082a359e5e3e9dbb34b8d74d82ef0063031b917c";

        //公共信息构建
        BaseReqInf baseReqInf = new BaseReqInf(companyId, appId, authoritySecret);
        XftVerifySignClient xftVerifySignClient = new XftVerifySignClient(baseReqInf, "https://api.cmburl.cn:8065/portal/common/common/OPSYTKLG");
        xftVerifySignClient.verifySign(data, sign);

    }

    @Test
    public void testVerifySign_decode签名验证() throws Exception {
        String data =
                "UkVRVElNPTE2NTYzMTIwODk0Mjd8VEtOTkJSPUNTQy0wMDAwMDAwMDAwMDEtcXZkbmlLRnp1bFlTdkJ3RXQ0ckhWTGJRbTN6dzFaRUNuOWV5U3NWNENXbWZCVHRlfENTQ1VSTD1odHRwOi8veGZ0LXdlYi1ob21lLWNzLnBhYXNzdC5jbWJjaGluYS5jbi9vcGVuYXBpfFBSSkNPRD1YRlQxMzU5MnxVU1JOQlI9VTAwMDB8VVNSVUlEPTEwMDAyNDQ1fFVTUk5BTT0xMjMxM3xPUEFVSUQ9MDBlOTg0MWEtZTA3Mi00Zjc5LThmYjAtNmZhNjdkNWMzMmMwfFNURlNFUT0wMDAwMDAwMDAxfENITkNPRD1XQg%3D%3D";
        String sign = "UyavCYJ4sAlPKcJN7jvAxvcdDftDsQgTAPSWjA%2BhT6I%3D";
        String test = "BBHBg85aC3ROF5MZ22DIP2k2WvXsIsT1muClA1AvTEBA4KBfDl5UrdEeQ1hQOiI8RCIZPi5ah4Yymv%2FDUKojIjU%3D";
        test = URLDecoder.decode(test, "UTF-8");
        /* 薪福通租户号 */
        String companyId = "XFT11728";
        /* 开放平台 appId*/
        String appId = "00e9841a-e072-4f79-8fb0-6fa67d5c32c0";
        /* 开放平台 authoritySecret*/
        String authoritySecret = "78d379284b3e718d50d8264a285db7902b11f275c2bc43f51b399e16a4ab9402";

        //公共信息构建
        BaseReqInf baseReqInf = new BaseReqInf(companyId, appId, authoritySecret);
        XftVerifySignClient xftVerifySignClient = new XftVerifySignClient(baseReqInf, "https://api.cmburl.cn:8065/portal/common1/common/OPSYTKLG");
        data = URLDecoder.decode(data, "UTF-8");
        sign = URLDecoder.decode(sign, "UTF-8");
        xftVerifySignClient.verifySign(data, sign);

    }

    @Test
    public void test() throws NoSuchAlgorithmException, UnsupportedEncodingException {

        String appSecret = "2ca146a46e8b130231f0cc3a082a359e5e3e9dbb34b8d74d82ef0063031b917c";
        String data =
                "VEtOTkJSPUNTQy02NjkwODI5MjIyMTMtSXIxWFQ1OEdTWFd6ZmdjWlVWWnVEWHc0ekxWenAwT2o5cUcyYnRNb1RtR0tVNHdDQzh8UkVRVElNPTE3MDU2NDQ1MTM5MzJ8T1BBVUlEPTMwMjdiZTc2LTg1NTgtNDkwNS04ZmFmLWIzYTcyMTUyZWMwZg%3D%3D";
        String sign = "NOQyr4DVUFYayi0QJ7P1nIDtvrajIJRaDWMlj8mbtVQ%3D";
        try {
            data = new String(Base64.decode(URLDecoder.decode(data, "UTF-8")));

        } catch (Exception e) {
            data = new String(Base64.decode(data));
        }

        String signStr = data + "&" + appSecret;
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        digest.update(signStr.getBytes("UTF-8"));
        byte[] buffer = digest.digest();
        String signal = Base64.encodeToString(buffer, false);
        if (sign.equals(signal) || URLDecoder.decode(sign, "UTF-8").equals(signal)) {
            System.out.println("密钥正确");
        } else {
            System.out.println("密钥错误");
        }

    }
}