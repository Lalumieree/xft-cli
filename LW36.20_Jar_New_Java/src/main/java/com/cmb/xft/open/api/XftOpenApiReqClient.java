package com.cmb.xft.open.api;


import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

public class XftOpenApiReqClient {
    private static final Log log = LogFactory.getLog(XftOpenApiReqClient.class);
    private static final String PARAM_FIELD_CSCAPPUID = "CSCAPPUID=";

    private static final String PARAM_FIELD_CSCPRJCOD = "&CSCPRJCOD=";

    private static final String PARAM_FIELD_CSCUSRUID = "&CSCUSRUID=";

    private static final String PARAM_FIELD_CSCREQTIM = "&CSCREQTIM=";

    private static final String PARAM_FIELD_CSCUSRNBR = "&CSCUSRNBR=";
    public static final String PARAM_FILED_EDSPRJCOD = "&EDSPRJCOD=";


    /**
     * post请求方式接口调用
     *
     * @param reqInf：请求基本信息，包括薪福通租户号、用户号，平台用户号，开放平台平台appId和authoritySecret
     * @param url：请求路径
     * @param requestBody：请求参数体,请求体为空，传入{}
     * @param queryParam：url里面除了公共参数（CSCAPPUID，CSCPRJCOD，CSCUSRUID，CSCREQTIM，CSCUSRNBR）的其他参数
     * @return 响应报文结果
     */
    public static HttpResponseData doCommonPostReq(BaseReqInf reqInf, String url, Map<String, Object> queryParam, String requestBody)
            throws Exception {
        SignInf signInf = getSignInf(reqInf, url, queryParam);
        String digest = SM3Utils.sm3Signature2(requestBody);
        String signStr = "POST " + signInf.getPath() + "\n" + "x-alb-digest: " + requestBody + "\n" + "x-alb-timestamp: " + signInf.getTimestamp();
        log.info("signStr:" + signStr);
        String apisign = Sm2SignatureUtils.sm3withsm2Signature(reqInf.getAuthoritySecret(), signStr);

        Map<String, String> headerMap = new HashMap<>();
        headerMap.put("Content-Type", "application/json; charset=utf-8");
        headerMap.put("appid", reqInf.getAppId());
        headerMap.put("x-alb-timestamp", signInf.getTimestamp());
        headerMap.put("x-alb-digest", digest);
        headerMap.put("apisign", apisign);
        headerMap.put("x-alb-verify", "sm3withsm2");
        String ctype = "application/json; charset=" + Constants.CHARSET_UTF8;
        return HttpReqUtils.execByType(signInf.getUrl(), ctype, requestBody.getBytes(StandardCharsets.UTF_8), 120000, 120000, headerMap, null,
                Constants.METHOD_POST, Constants.RESPONSE_TYPE_STRING);
    }

    /**
     * GET请求方式接口调用
     *
     * @param reqInf：请求基本信息，包括薪福通租户号、用户号，平台用户悔，开放平台平台appId和authoritySecret
     * @param url：请求路径
     * @param queryParam：url里面除了公共参数（CSCAPPUID，CSCPRJCOD，CSCUSRUID，CSCREQTIM，CSCUSRNBR）的其他参数
     * @return 响应报文结果
     */
    public static HttpResponseData doCommonGetReq(BaseReqInf reqInf, String url, Map<String, Object> queryParam)
            throws Exception {
        SignInf signInf = getSignInf(reqInf, url, queryParam);
        String signStr = "GET " + signInf.getPath() + "\n" + "x-alb-timestamp: " + signInf.getTimestamp();
        log.info("signStr:" + signStr);
        String apisign = Sm2SignatureUtils.sm3withsm2Signature(reqInf.getAuthoritySecret(), signStr);

        Map<String, String> headerMap = new HashMap<>();
        headerMap.put("Content-Type", "application/json; charset=utf-8");
        headerMap.put("appid", reqInf.getAppId());
        headerMap.put("x-alb-timestamp", signInf.getTimestamp());
        headerMap.put("apisign", apisign);
        headerMap.put("x-alb-verify", "sm3withsm2");
        return HttpReqUtils.doGet(signInf.getUrl(), null, Constants.CHARSET_UTF8, 120000, 120000, headerMap, null);
    }


    /**
     * 文件上传接口
     *
     * @param reqInf：请求基本信息，包括薪福通租户号、用户号，平台用户悔，开放平台平台appId和authoritySecret
     * @param url：请求路径
     * @param file：上传的文件
     * @param queryParam：url里面除了公共参数（CSCAPPUID，CSCPRJCOD，CSCUSRUID，CSCREQTIM，CSCUSRNBR）的其他参数
     * @return 响应报文结果
     */
    public static HttpResponseData doFileUploadByFileReq(BaseReqInf reqInf, String url, Map<String, Object> queryParam, MultipartFile file)
            throws Exception {
        byte[] bytes = file.getBytes();
        if (bytes.length > 20 * 1024 * 1024) {
            throw new RuntimeException("文件内容过大");
        }
        SignInf signInf = getSignInf(reqInf, url, queryParam);

        String signStr = "POST " + signInf.getPath() + "\n" + "x-alb-timestamp: " + signInf.getTimestamp();
        log.info("signStr:" + signStr);
        String apisign = Sm2SignatureUtils.sm3withsm2Signature(reqInf.getAuthoritySecret(), signStr);

        Map<String, String> headerMap = new HashMap<>();
        headerMap.put("appid", reqInf.getAppId());
        headerMap.put("x-alb-timestamp", signInf.getTimestamp());
        headerMap.put("apisign", apisign);
        headerMap.put("x-alb-verify", "sm3withsm2");

        return HttpReqUtils.doFileUpload(signInf.getUrl(), null, file.getName(), bytes, headerMap, Constants.RESPONSE_TYPE_STRING);
    }


    /**
     * 文件上传接口
     *
     * @param reqInf：请求基本信息，包括薪福通租户号、用户号，平台用户悔，开放平台平台appId和authoritySecret
     * @param url：请求路径
     * @param file：上传的文件
     * @param queryParam：url里面除了公共参数（CSCAPPUID，CSCPRJCOD，CSCUSRUID，CSCREQTIM，CSCUSRNBR）的其他参数
     * @return 响应报文结果
     */
    public static HttpResponseData doFileUploadByFileWithOriginalName(BaseReqInf reqInf, String url, Map<String, Object> queryParam,
                                                                     MultipartFile file)
            throws Exception {
        byte[] bytes = file.getBytes();
        if (bytes.length > 20 * 1024 * 1024) {
            throw new RuntimeException("文件内容过大");
        }
        SignInf signInf = getSignInf(reqInf, url, queryParam);

        String signStr = "POST " + signInf.getPath() + "\n" + "x-alb-timestamp: " + signInf.getTimestamp();
        log.info("signStr:" + signStr);
        String apisign = Sm2SignatureUtils.sm3withsm2Signature(reqInf.getAuthoritySecret(), signStr);

        Map<String, String> headerMap = new HashMap<>();
        headerMap.put("appid", reqInf.getAppId());
        headerMap.put("x-alb-timestamp", signInf.getTimestamp());
        headerMap.put("apisign", apisign);
        headerMap.put("x-alb-verify", "sm3withsm2");

        return HttpReqUtils.doFileUpload(signInf.getUrl(), null, file.getOriginalFilename(), bytes, headerMap, Constants.RESPONSE_TYPE_STRING);
    }

    private static SignInf getSignInf(BaseReqInf reqInf, String url, Map<String, Object> queryParam) {
        long currentTimeMillis = System.currentTimeMillis();
        String timestamp = String.valueOf(currentTimeMillis / 1000);
        StringBuilder paramStringBuild = new StringBuilder();
        paramStringBuild.append(PARAM_FIELD_CSCAPPUID).append(reqInf.getAppId());
        if (!StringUtils.isEmpty(reqInf.getCompanyId())) {
            paramStringBuild.append(PARAM_FIELD_CSCPRJCOD).append(reqInf.getCompanyId());
        }
        if (!StringUtils.isEmpty(reqInf.getUsrNbr())) {
            paramStringBuild.append(PARAM_FIELD_CSCUSRNBR).append(reqInf.getUsrNbr());
        }
        if (!StringUtils.isEmpty(reqInf.getUsrUid())) {
            paramStringBuild.append(PARAM_FIELD_CSCUSRUID).append(reqInf.getUsrUid());
        }
        if (!StringUtils.isEmpty(reqInf.getEdsCompanyId())) {
            paramStringBuild.append(PARAM_FILED_EDSPRJCOD).append(reqInf.getCompanyId());
        }
        paramStringBuild.append(PARAM_FIELD_CSCREQTIM).append(currentTimeMillis);

        if (null != queryParam) {
            Iterator<Map.Entry<String, Object>> it = queryParam.entrySet().iterator();
            while (it.hasNext()) {
                Map.Entry<String, Object> entry = it.next();
                paramStringBuild.append("&").append(entry.getKey()).append("=").append(entry.getValue());
            }
        }
        url = url + "?" + paramStringBuild;
        String subUrl = url.replaceAll("http://", "").replaceAll("https://", "");
        int pathIndex = subUrl.indexOf("/");
        String path = subUrl.substring(pathIndex);
        return new SignInf(timestamp, url, path);
    }


    /**
     * GET接口文件下载
     *
     * @param reqInf：请求基本信息，包括薪福通租户号、用户号，平台用户号，开放平台平台appId和authoritySecret
     * @param url：请求路径
     * @param queryParam：url里面除了公共参数（CSCAPPUID，CSCPRJCOD，CSCUSRUID，CSCREQTIM，CSCUSRNBR）的其他参数
     * @return 响应报文结果
     */
    public static HttpResponseData doGetFileDownloadReq(BaseReqInf reqInf, String url, Map<String, Object> queryParam)
            throws Exception {

        SignInf signInf = getSignInf(reqInf, url, queryParam);
        String signStr = "GET " + signInf.getPath() + "\n" + "x-alb-timestamp: " + signInf.getTimestamp();
        log.info("signStr:" + signStr);
        String apisign = Sm2SignatureUtils.sm3withsm2Signature(reqInf.getAuthoritySecret(), signStr);
        Map<String, String> headerMap = new HashMap<>();
        headerMap.put("Content-Type", "application/json; charset=utf-8");
        headerMap.put("appid", reqInf.getAppId());
        headerMap.put("x-alb-timestamp", signInf.getTimestamp());
        headerMap.put("apisign", apisign);
        headerMap.put("x-alb-verify", "sm3withsm2");
        return HttpReqUtils.doFileDownload(signInf.getUrl(), null, headerMap, Constants.RESPONSE_TYPE_BYTE, Constants.METHOD_GET);
    }

    /**
     * POST接口文件下载
     *
     * @param reqInf：请求基本信息，包括薪福通租户号、用户号，平台用户号，开放平台平台appId和authoritySecret
     * @param url：请求路径
     * @param requestBody：请求参数体,请求参数体为空传入{}
     * @param queryParam：url里面除了公共参数（CSCAPPUID，CSCPRJCOD，CSCUSRUID，CSCREQTIM，CSCUSRNBR）的其他参数
     * @return 响应报文结果
     */
    public static HttpResponseData doPostFileDownloadReq(BaseReqInf reqInf, String url, Map<String, Object> queryParam, String requestBody)
            throws Exception {
        SignInf signInf = getSignInf(reqInf, url, queryParam);
        String digest = SM3Utils.sm3Signature2(requestBody);
        String signStr = "POST " + signInf.getPath() + "\n" + "x-alb-digest: " + requestBody + "\n" + "x-alb-timestamp: " + signInf.getTimestamp();
        log.info("signStr:" + signStr);
        String apisign = Sm2SignatureUtils.sm3withsm2Signature(reqInf.getAuthoritySecret(), signStr);
        Map<String, String> headerMap = new HashMap<>();
        headerMap.put("Content-Type", "application/json; charset=utf-8");
        headerMap.put("appid", reqInf.getAppId());
        headerMap.put("x-alb-timestamp", signInf.getTimestamp());
        headerMap.put("x-alb-digest", digest);
        headerMap.put("apisign", apisign);
        headerMap.put("x-alb-verify", "sm3withsm2");
        String ctype = "application/json; charset=" + Constants.CHARSET_UTF8;

        return HttpReqUtils.execByType(signInf.getUrl(), ctype, requestBody.getBytes(StandardCharsets.UTF_8), 120000, 120000, headerMap, null,
                Constants.METHOD_POST, Constants.RESPONSE_TYPE_BYTE);
    }

}
