package com.cmb.xft.open.api;

import com.google.gson.Gson;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.BlockJUnit4ClassRunner;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.TreeMap;

/**
 * @author 80280491
 * @date 2024/4/28
 */
@RunWith(BlockJUnit4ClassRunner.class)
public class XftOpenApiEncryptClientTest {
    @Test
    public void doCommonPostReq_不带其他queryParam的请求() throws Exception {
        String key = "009b523f629bbd8fba7ead9887d6eba2";
    String body = "c03f4fb0dc85a9da73589739092950217f25e10aff3fcbb4deb1aa9e61ffc80a53aca37bd8a29af37566bbbc298d9cdeba50b9eda15e52c05b85306ff2dff03ac6e1d0e1ee6cb3898ab9c5c3f2a6ccca";
        try {
            String responseBody = Sm4Util.decryptEcb(key, body);
            System.out.println(responseBody);
        } catch (Exception e) {
            System.out.println("解密失败：" + body);
        }

    }

    @Test
    public void doCommonPostReq_带有其他queryParam的请求() throws Exception {
        /* 薪福通租户号 */
        String companyId = "XFT11728";
        /* 开放平台 appId*/
        String appId = "00e9841a-e072-4f79-8fb0-6fa67d5c32c0";
        /* 开放平台 authoritySecret*/
        String authoritySecret = "78d379284b3e718d50d8264a285db7902b11f275c2bc43f51b399e16a4ab9402";
        //加密和解密密文的key
        String key = authoritySecret.substring(0, 32);
        //请求路径
        String url = "https://api.cmburl.cn:8065/itrip/xft-api/uat1/v1/bills/queryDetails";
        String requestBody = "{\"applyTimStart\":\"2022-4-11\",\"applyTimEnd\":\"2022-4-12 15:00:00\",\"limit\":20}";

        //请求内容加密
        String secretMsg = Sm4Util.encryptEcb(key, requestBody);
        Map<String, String> newRequestBodyMap = new HashMap<>();
        //secretMsg这个名称固定
        newRequestBodyMap.put("secretMsg", secretMsg);
        Gson gson = new Gson();
        requestBody = gson.toJson(newRequestBodyMap);

        BaseReqInf baseReqInf = new BaseReqInf(appId, authoritySecret);
        Map<String, Object> queryParam = new TreeMap<>();
        queryParam.put("OPAUID", companyId);
        HttpResponseData postReqResult = XftOpenApiReqClient.doCommonPostReq(baseReqInf, url, queryParam, requestBody);
        String responseBody = postReqResult.getBody();
        try {
            responseBody = Sm4Util.decryptEcb(key, responseBody);
            System.out.println(responseBody);
        } catch (Exception e) {
            System.out.println("解密失败：" + responseBody);
        }

    }

    @Test
    public void doCommonGetReq_get请求() throws Exception {
        /* 开放平台 appId*/
        String appId = "00e9841a-e072-4f79-8fb0-6fa67d5c32c0";
        /* 开放平台 authoritySecret*/
        String authoritySecret = "78d379284b3e718d50d8264a285db7902b11f275c2bc43f51b399e16a4ab9402";
        //加密和解密密文的key
        String key = authoritySecret.substring(0, 32);
        //请求路径
        String url = "https://api.cmburl.cn:8065/itrip/xft-api/uat1/v1/bills/detail/2022011900579603";
        //公共信息构建
        BaseReqInf baseReqInf = new BaseReqInf(appId, authoritySecret);
        baseReqInf.setUsrNbr("usrNbr");
        baseReqInf.setUsrUid("usrUid");
        String queryString = "{\"OPAUID\":\"XFT11728\"}";
        Gson gs = new Gson();
        Map<String, Object> queryParam = gs.fromJson(queryString, TreeMap.class);
        HttpResponseData postReqResult = XftOpenApiReqClient.doCommonGetReq(baseReqInf, url, queryParam);
        String responseBody = postReqResult.getBody();
        try {
            responseBody = Sm4Util.decryptEcb(key, responseBody);
            System.out.println(responseBody);
        } catch (Exception e) {
            System.out.println("解密失败：" + responseBody);
        }

    }


    @Test
    public void doFileUploadByFileReq_上传文件测试() throws Exception {
        /* 开放平台 appId*/
        String appId = "00e9841a-e072-4f79-8fb0-6fa67d5c32c0";
        /* 开放平台 authoritySecret*/
        String authoritySecret = "78d379284b3e718d50d8264a285db7902b11f275c2bc43f51b399e16a4ab9402";
        //加密和解密密文的key
        String key = authoritySecret.substring(0, 32);
        //请求路径
        String url = "https://api.cmburl.cn:8065/portal/common1/xft-file/resource/uploadPublicFile";

        //公共信息构建
        BaseReqInf baseReqInf = new BaseReqInf(appId, authoritySecret);

        File file = new File("D:\\22.png");
        FileInputStream fileInputStream = new FileInputStream(file);
        MultipartFile multipartFile = new MockMultipartFile(file.getName(), fileInputStream);
        HttpResponseData postReqResult = XftOpenApiReqClient.doFileUploadByFileReq(baseReqInf, url, null, multipartFile);
        String responseBody = postReqResult.getBody();
        try {
            responseBody = Sm4Util.decryptEcb(key, responseBody);
            System.out.println(responseBody);
        } catch (Exception e) {
            System.out.println("解密失败：" + responseBody);
        }

    }

    @Test
    public void doPostFileDownloadReq_根据流水号下载文件测试() {
        /* 开放平台 appId*/
        String appId = "00e9841a-e072-4f79-8fb0-6fa67d5c32c0";
        /* 开放平台 authoritySecret*/
        String authoritySecret = "78d379284b3e718d50d8264a285db7902b11f275c2bc43f51b399e16a4ab9402";
        //加密和解密密文的key
        String key = authoritySecret.substring(0, 32);
        //请求路径
        String url = "https://api.cmburl.cn:8065/portal/common1/xft-file/resource/downloadFile";

        //公共信息构建
        BaseReqInf baseReqInf = new BaseReqInf(appId, authoritySecret);
        String responseBody = null;
        try {

            String requestBody = "{\"bucketType\":\"public\",\"filnum\":\"20240429111338460-IJkthYZYkbKr\"}";
            //请求内容加密
            String secretMsg = Sm4Util.encryptEcb(key, requestBody);
            Map<String, String> newRequestBodyMap = new HashMap<>();
            //secretMsg这个名称固定
            newRequestBodyMap.put("secretMsg", secretMsg);
            Gson gson = new Gson();
            requestBody = gson.toJson(newRequestBodyMap);

            HttpResponseData postReqResult = XftOpenApiReqClient.doPostFileDownloadReq(baseReqInf, url, null, requestBody);
            responseBody = postReqResult.getBody();
            OutputStream out = new FileOutputStream("D:\\kk11.png", false);
            out.write(responseBody.getBytes(Constants.CHARSET_ISO));
            out.close();
        } catch (Exception e) {
            try {
                responseBody = Sm4Util.decryptEcb(key, responseBody);
                System.out.println(responseBody);
            } catch (Exception e2) {
                System.out.println("解密失败：" + responseBody);
            }
        }
    }


    @Test
    public void doGetFileDownloadReq_GET下载文件测试() {
        /* 薪福通租户号 */
        String companyId = "XFT11728";
        /* 开放平台 appId*/
        String appId = "00e9841a-e072-4f79-8fb0-6fa67d5c32c0";
        /* 开放平台 authoritySecret*/
        String authoritySecret = "78d379284b3e718d50d8264a285db7902b11f275c2bc43f51b399e16a4ab9402";
        //加密和解密密文的key
        String key = authoritySecret.substring(0, 32);
        //请求路径
        String url = "https://api.cmburl.cn:8065/itrip/xft-api/uat1/v1/invoice/downloadHisInvoice";

        //公共信息构建
        BaseReqInf baseReqInf = new BaseReqInf(appId, authoritySecret);
        Map<String, Object> queryParam = new TreeMap<>();
        queryParam.put("OPAUID", companyId);
        queryParam.put("fileName", "2022012000581012.zip");
        queryParam.put("billId", "2022012000581012");
        String responseBody = null;
        try {
            HttpResponseData result = XftOpenApiReqClient.doGetFileDownloadReq(baseReqInf, url, queryParam);
            responseBody = result.getBody();
            OutputStream out = new FileOutputStream("D:\\test.zip", false);
            out.write(responseBody.getBytes(Constants.CHARSET_ISO));
            out.close();
        } catch (Exception e) {
            try {
                responseBody = Sm4Util.decryptEcb(key, responseBody);
                System.out.println(responseBody);
            } catch (Exception e2) {
                System.out.println("解密失败：" + responseBody);
            }
        }

    }

    @Test
    public void doPostFileDownloadReq_根据objectKey进行文件下载() throws Exception {
        /* 开放平台 appId*/
        String appId = "00e9841a-e072-4f79-8fb0-6fa67d5c32c0";
        /* 开放平台 authoritySecret*/
        String authoritySecret = "78d379284b3e718d50d8264a285db7902b11f275c2bc43f51b399e16a4ab9402";
        //加密和解密密文的key
        String key = authoritySecret.substring(0, 32);
        //请求路径
        String url = "https://api.cmburl.cn:8065/portal/common1/xft-file/resource/downloadFileBykey";

        //公共信息构建
        BaseReqInf baseReqInf = new BaseReqInf(appId, authoritySecret);

        String requestBody =
                "{\"fileName\":\"1656407789364.png \",\"bucketType\":\"private\",\"objKey\":\"592d4497-3a1b-4b13-8a41-81cd2314893a\"}";
        //请求内容加密
        String secretMsg = Sm4Util.encryptEcb(key, requestBody);
        Map<String, String> newRequestBodyMap = new HashMap<>();
        //secretMsg这个名称固定
        newRequestBodyMap.put("secretMsg", secretMsg);
        Gson gson = new Gson();
        requestBody = gson.toJson(newRequestBodyMap);
        String responseBody = null;
        try {
            HttpResponseData postReqResult = XftOpenApiReqClient.doPostFileDownloadReq(baseReqInf, url, null, requestBody);
            responseBody = postReqResult.getBody();
            OutputStream out = new FileOutputStream("D:\\kk112.png", false);
            out.write(responseBody.getBytes(Constants.CHARSET_ISO));
            out.close();
            System.out.println(postReqResult.getBody());
        } catch (Exception e) {
            try {
                responseBody = Sm4Util.decryptEcb(key, responseBody);
                System.out.println(responseBody);
            } catch (Exception e2) {
                System.out.println("解密失败：" + responseBody);
            }
        }
    }

}
