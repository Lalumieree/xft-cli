package com.cmb.xft.open.api;

import com.google.gson.Gson;
import org.bouncycastle.crypto.CryptoException;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.BlockJUnit4ClassRunner;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;

@RunWith(BlockJUnit4ClassRunner.class)
public class XftOpenApiReqClientTest {

    @Test
    public void doCommonPostReq_不带其他queryParam的请求() throws Exception {

        /* 开放平台 appId*/
        String appId = "bccef07a-2f78-4112-9cdf-4786853c8880";
        /* 开放平台 authoritySecret*/
        String authoritySecret = "2ca146a46e8b130231f0cc3a082a359e5e3e9dbb34b8d74d82ef0063031b917c";
        //请求路径
        String url = "http://localhost:8081/api/service-open-rest-new/test/gate-way";

        //公共信息构建
        BaseReqInf baseReqInf = new BaseReqInf(appId, authoritySecret);

        //请求参数构建方式一：字符串形式(推荐使用方式)
        String requestBody = "{}";

        HttpResponseData postReqResult = XftOpenApiReqClient.doCommonPostReq(baseReqInf, url, null, requestBody);
        System.out.println(postReqResult.getBody());
    }

    @Test
    public void doCommonPostReq_带有其他queryParam的请求() throws Exception {
        /* 薪福通租户号 */
        String companyId = "XFT11728";
        /* 开放平台 appId*/
        String appId = "00e9841a-e072-4f79-8fb0-6fa67d5c32c0";
        /* 开放平台 authoritySecret*/
        String authoritySecret = "78d379284b3e718d50d8264a285db7902b11f275c2bc43f51b399e16a4ab9402";
        //请求路径
        String url = "https://api.cmburl.cn:8065/itrip/xft-api/uat1/v1/bills/queryDetails";
        String requestBody = "{\"applyTimStart\":\"2022-4-11\",\"applyTimEnd\":\"2022-4-12 15:00:00\",\"limit\":20}";
        BaseReqInf baseReqInf = new BaseReqInf(appId, authoritySecret);
        Map<String, Object> queryParam = new HashMap<>();
        queryParam.put("OPAUID", companyId);
        queryParam.put("test", companyId);
        queryParam.put("CSCSTFSEQ", "resd");
        HttpResponseData postReqResult = XftOpenApiReqClient.doCommonPostReq(baseReqInf, url, queryParam, requestBody);
        System.out.println(postReqResult.getBody());
    }

    @Test
    public void doCommonGetReq_get请求() throws Exception {
        /* 开放平台 appId*/
        String appId = "00e9841a-e072-4f79-8fb0-6fa67d5c32c0";
        /* 开放平台 authoritySecret*/
        String authoritySecret = "78d379284b3e718d50d8264a285db7902b11f275c2bc43f51b399e16a4ab9402";
        //请求路径
        String url = "https://api.cmburl.cn:8065/itrip/xft-api/uat1/v1/bills/detail/2022011900579603";

        //公共信息构建
        BaseReqInf baseReqInf = new BaseReqInf(appId, authoritySecret);
        baseReqInf.setUsrNbr("A0001");
        baseReqInf.setUsrUid("AUTO0001");
        String queryString = "{\"OPAUID\":\"XFT11728\"}";
        Gson gs = new Gson();
        Map<String, Object> queryParam = gs.fromJson(queryString, Map.class);
        HttpResponseData postReqResult = XftOpenApiReqClient.doCommonGetReq(baseReqInf, url, queryParam);
        System.out.println(postReqResult.getBody());
    }

    @Test
    public void doFileUploadByFileReq_上传文件测试() throws Exception {
        /* 开放平台 appId*/
        String appId = "00e9841a-e072-4f79-8fb0-6fa67d5c32c0";
        /* 开放平台 authoritySecret*/
        String authoritySecret = "78d379284b3e718d50d8264a285db7902b11f275c2bc43f51b399e16a4ab9402";
        //请求路径
        String url = "https://api.cmburl.cn:8065/portal/common1/xft-file/resource/uploadPublicFile";

        //公共信息构建
        BaseReqInf baseReqInf = new BaseReqInf(appId, authoritySecret);

        File file = new File("D:\\22.png");
        FileInputStream fileInputStream = new FileInputStream(file);
        MultipartFile multipartFile = new MockMultipartFile(file.getName(), fileInputStream);
        HttpResponseData postReqResult = XftOpenApiReqClient.doFileUploadByFileReq(baseReqInf, url, null, multipartFile);
        System.out.println(postReqResult.getBody());
    }

    @Test
    public void doPostFileDownloadReq_根据流水号下载文件测试() {
        /* 开放平台 appId*/
        String appId = "00e9841a-e072-4f79-8fb0-6fa67d5c32c0";
        /* 开放平台 authoritySecret*/
        String authoritySecret = "78d379284b3e718d50d8264a285db7902b11f275c2bc43f51b399e16a4ab9402";
        //请求路径
        String url = "https://api.cmburl.cn:8065/portal/common1/xft-file/resource/downloadFile";

        //公共信息构建
        BaseReqInf baseReqInf = new BaseReqInf(appId, authoritySecret);

        try {

            String param = "{\"bucketType\":\"public\",\"filnum\":\"20220624114422205-690868318495\",\"compress\":false}";
            HttpResponseData postReqResult = XftOpenApiReqClient.doPostFileDownloadReq(baseReqInf, url, null, param);
            OutputStream out = new FileOutputStream("D:\\kk11.png", false);
            out.write(postReqResult.getBody().getBytes(Constants.CHARSET_ISO));
            out.close();
            System.out.println(postReqResult.getBody());
        } catch (Exception e) {
            //异常处理
        }
    }

    @Test
    public void doGetFileDownloadReq_GET下载文件测试() throws Exception {
        /* 薪福通租户号 */
        String companyId = "XFT11728";
        /* 开放平台 appId*/
        String appId = "00e9841a-e072-4f79-8fb0-6fa67d5c32c0";
        /* 开放平台 authoritySecret*/
        String authoritySecret = "78d379284b3e718d50d8264a285db7902b11f275c2bc43f51b399e16a4ab9402";
        //请求路径
        String url = "https://api.cmburl.cn:8065/itrip/xft-api/uat1/v1/invoice/downloadHisInvoice";

        //公共信息构建
        BaseReqInf baseReqInf = new BaseReqInf(appId, authoritySecret);
        Map<String, Object> queryParam = new HashMap<>();
        queryParam.put("OPAUID", companyId);
        queryParam.put("fileName", "2022012000581012.zip");
        queryParam.put("billId", "2022012000581012");

        HttpResponseData result = XftOpenApiReqClient.doGetFileDownloadReq(baseReqInf, url, queryParam);

        OutputStream out = new FileOutputStream("D:\\test.zip", false);
        out.write(result.getBody().getBytes(Constants.CHARSET_ISO));
        out.close();
        System.out.println(result.getBody());
    }


    @Test
    public void doPostFileDownloadReq_根据objectKey进行文件下载() {
        /* 开放平台 appId*/
        String appId = "00e9841a-e072-4f79-8fb0-6fa67d5c32c0";
        /* 开放平台 authoritySecret*/
        String authoritySecret = "78d379284b3e718d50d8264a285db7902b11f275c2bc43f51b399e16a4ab9402";
        //请求路径
        String url = "https://api.cmburl.cn:8065/portal/common1/xft-file/resource/downloadFileBykey";

        //公共信息构建
        BaseReqInf baseReqInf = new BaseReqInf(appId, authoritySecret);

        try {

            String param = "{\"fileName\":\"1656407789364.png \",\"bucketType\":\"private\",\"objKey\":\"592d4497-3a1b-4b13-8a41-81cd2314893a\"}";
            HttpResponseData postReqResult = XftOpenApiReqClient.doPostFileDownloadReq(baseReqInf, url, null, param);
            OutputStream out = new FileOutputStream("D:\\kk112.png", false);
            out.write(postReqResult.getBody().getBytes(Constants.CHARSET_ISO));
            out.close();
            System.out.println(postReqResult.getBody());
        } catch (Exception e) {
            //异常处理
        }
    }


    @Test
    public void doCommonPostReq_输入输出加密() throws Exception {
        /* 薪福通租户号 */
        String companyId = "XFT11728";
        /* 开放平台 appId，找开放平台管理员把应用设置为输入输出加密*/
        String appId = "00e9841a-e072-4f79-8fb0-6fa67d5c32c0";
        /* 开放平台 authoritySecret*/
        String authoritySecret = "78d379284b3e718d50d8264a285db7902b11f275c2bc43f51b399e16a4ab9402";
        //请求路径
        String url = "https://api.cmburl.cn:8065/itrip/xft-api/uat1/v1/bills/queryDetails";

        String requestBody = "{\"applyTimStart\":\"2022-4-11\",\"applyTimEnd\":\"2022-4-12 15:00:00\",\"limit\":2}";
        //加密和解密密文的key
        String key = authoritySecret.substring(0, 32);
        //请求内容加密
        String secretMsg = Sm4Util.encryptEcb(key, requestBody);

        Map<String, String> newRequestBodyMap = new HashMap<>();
        //secretMsg这个名称固定
        newRequestBodyMap.put("secretMsg", secretMsg);
        Gson gson = new Gson();
        requestBody = gson.toJson(newRequestBodyMap);

        BaseReqInf baseReqInf = new BaseReqInf(appId, authoritySecret);
        Map<String, Object> queryParam = new HashMap<>();
        queryParam.put("OPAUID", companyId);
        queryParam.put("test", companyId);
        queryParam.put("CSCSTFSEQ", "resd");
        System.out.println("加密后请求body:" + requestBody);
        HttpResponseData postReqResult = XftOpenApiReqClient.doCommonPostReq(baseReqInf, url, queryParam, requestBody);
        String responseBody = postReqResult.getBody();
        System.out.println("解密前body:" + responseBody);
        responseBody = Sm4Util.decryptEcb(key, responseBody);
        System.out.println("解密后body:" + responseBody);
    }


    @Test
    public void apisign() throws IOException, CryptoException {
        String appId = "9f31f235-33c7-4c11-8cc1-11545680dbab";
        String authoritySecret = "3ddf941ee9e8c4bdc95fc948422d4c905cfcbd4d5cf92c9383aca9176f5a104e";
        String signStr =
                "POST /common/api/common/common/OPSYTKLG?CSCAPPUID=9f31f235-33c7-4c11-8cc1-11545680dbab&CSCPRJCOD=XFV91013&CSCREQTIM=1676982018679&CSCUSRNBR=U0000&CSCUSRUID=10283987\n"
                        + "x-alb-digest: {}\n" + "x-alb-timestamp: 1676982018";
        String apisign = Sm2SignatureUtils.sm3withsm2Signature(authoritySecret, signStr);
        System.out.println("apisign:" + apisign);
    }

    @Test
    public void connector_trigger_test() throws Exception {

        /* 开放平台 appId*/
        String appId = "013098f4-6bd0-4b10-92c8-30a2906194b1";
        /* 开放平台 authoritySecret*/
        String authoritySecret = "00b3a77afa20439ee99e274a4bb970cfbdceef7184a2c9e4c93869e3d52d2582aa";
        //触发器触发地址
        String url =
                "https://api.cmburl.cn:8065/connector-platform/st/connector-platform/open/v1/service/trigger/0cffb209b13f431da4a3bcf4d9f24fe9/4ae22741fc6840d8a077abdb2bea4244";
        //公共信息构建
        BaseReqInf baseReqInf = new BaseReqInf(appId, authoritySecret);
        //触发器输入参数
        String requestBody = "{\"date\":\"2022-4-11\"}";
        HttpResponseData postReqResult = XftOpenApiReqClient.doCommonPostReq(baseReqInf, url, null, requestBody);
        System.out.println(postReqResult.getBody());
    }

    @Test
    public void decry() throws Exception {

        String key = "008b26bbb692a9e0a2e116e5958457a0";

        String newAppSecret =
                "431a43be0f17b8b4a1298f018e10268db5d61af61b3c3c943d1c781a025035d7141d33d9e8aead4a44ae29c31cace6750cb2b60aed28043c97d55ad42a875d9fbf3830f0a0f3a27c7c2f658c551624847e7a140fec6df59733dc5ee4c453509e";
        System.out.println("appSecret: " + Sm4Util.decryptEcb(key, newAppSecret));
        String newAppPvtKey =
                "c1187e150ec5f1e9a6ced02b96650278288e195d19b44a113637866a8d5cd79249e27f6a705dbdd3e797fa3e3c0d1418";
        System.out.println("appPvtKey: " + Sm4Util.decryptEcb(key, newAppPvtKey));

        String newAppSusKey =
                "d68c34272f1f5289bf8d8d0b85c3fba8a3e37e24468a0a6c190b7395f694fcc562df062e23651055678afb875e867acc69426f472f46f9900c173c84f4b78cc0ae450d7a8b3368af5a89e5104be89f54869d5602f8bab8e32b5b7348dbcfde17784ef8d621213d5260f16b995e370af31ce3da2dafa940ee21c34d1c00723ebbfa2cd38d81742f569ff613158684556f";
        System.out.println("appSusKey: " + Sm4Util.decryptEcb(key, newAppSusKey));

        String newAppSusPvtKey =
                "fcccba01290754061a1e81fea04329daecdaee3cf29a5cbb5a059d3670e4f438408202a162eaa898f00fba28e42d1a144001805bbc84adb7c3b0a6f94a8db359bd383eae4ecf1906fad2109a23ee4099";
        System.out.println("appSusPvtKey: " + Sm4Util.decryptEcb(key, newAppSusPvtKey));

    }

    @Test
    public void event() throws Exception {
        String key1 =
                "049f10300589d6fd11db19d20e3175147313758f602a3c133c6a04af5df912c90d45fe3eaa222e4efa0a8ec8b2f2d0f60157ad572063565a37d56b537d4a0d4d34".substring(0,32);
        String message =
                "21f486aba7fe7739e2d3f6aa28132b428ecb281e96ed05f51f35366530351c0591526192c0c7d10713b9fe2e61b8d1158976fd895a7a8203fe398941d7d75a1abe77fc881b546d3bee7f8ad0e0d19b9acb88ecaef8cfcc359b9c69014fab2600d4e78910bbaa6fceda778fdd11387cfbc26c9db16b7833803dfdcdc073ba0ff0";
        Sm4Util.decryptEcb(key1, message);
    }
}
