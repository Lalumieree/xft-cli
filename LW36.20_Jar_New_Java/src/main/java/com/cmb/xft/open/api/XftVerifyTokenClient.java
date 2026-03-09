package com.cmb.xft.open.api;

import com.cmb.xft.open.login.token.LoginInfo;
import com.cmb.xft.open.login.token.LoginTokenInfo;
import com.cmb.xft.open.utils.Base64;
import com.google.gson.Gson;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HashMap;
import java.util.Map;

import static com.cmb.xft.open.api.Constants.CHARSET_UTF8;

public class XftVerifyTokenClient {
    private static final Log log = LogFactory.getLog(XftVerifyTokenClient.class);
    private final BaseReqInf baseReqInf;

    private final String accessTokenUrl;

    private String loginUserUrl;

    public XftVerifyTokenClient(BaseReqInf baseReqInf, String accessTokenUrl) {
        this.accessTokenUrl = accessTokenUrl;
        this.baseReqInf = baseReqInf;
    }

    public XftVerifyTokenClient(BaseReqInf baseReqInf, String accessTokenUrl, String loginUserUrl) {
        this.accessTokenUrl = accessTokenUrl;
        this.loginUserUrl = loginUserUrl;
        this.baseReqInf = baseReqInf;
    }

    /**
     * 跳转后，根据跳转参数中的data字段获取详细登录信息
     * 限制：data仅两分钟内，有且仅有一次调用有效，需要申请接口权限
     *
     * @param data
     * @param sign
     * @return
     * @throws Exception
     */
    public LoginInfo getLoginInfo(String data, final String sign) throws Exception {
        // 获得accessToken
        LoginTokenInfo loginTokenInfo = verifyToken(data, sign);
        if (null == loginTokenInfo) {
            return null;
        }
        // 根据accessToken获得登录信息
        String format = "{\"token\":\"%s\"}";
        String body = String.format(format, loginTokenInfo.getToken());
        baseReqInf.setCompanyId(loginTokenInfo.getEnterpriseId());
        baseReqInf.setUsrNbr(loginTokenInfo.getEnterpriseUserId());
        baseReqInf.setUsrUid(loginTokenInfo.getAccountId());

        //请求内容加密
        String key = baseReqInf.getAuthoritySecret().substring(0, 32);
        String secretMsg = Sm4Util.encryptEcb(key, body);
        Map<String, String> newRequestBodyMap = new HashMap<>(8);
        //secretMsg这个名称固定
        newRequestBodyMap.put("secretMsg", secretMsg);
        Gson gson = new Gson();
        body = gson.toJson(newRequestBodyMap);

        HttpResponseData responseData = XftOpenApiReqClient.doCommonPostReq(baseReqInf, loginUserUrl, null, body);

        if (!responseData.isSuccess()) {
            throw Constants.ERROR_LOGIN_USER;
        }
        String responseBody = responseData.getBody();
        responseBody = Sm4Util.decryptEcb(key, responseBody);
        XftFrameworkResponse xftFrameworkResponse = gson.fromJson(responseBody, XftFrameworkResponse.class);
        if (!xftFrameworkResponse.isSuccess()) {
            throw new XftSignException(xftFrameworkResponse.getReturnCode(), xftFrameworkResponse.getErrorMsg());
        }
        return gson.fromJson(gson.toJson(xftFrameworkResponse.getBody()), LoginInfo.class);
    }

    /**
     * 跳转后，根据跳转参数中的data字段获取accessToken
     * 限制：data仅两分钟内，有且仅有一次调用有效
     *
     * @param data
     * @param sign
     * @return
     * @throws Exception
     */
    public LoginTokenInfo verifyToken(String data, final String sign) throws Exception {
        // 从data中解析得到token
        String dateStr = getDataStr(data);
        Map<String, String> dataMap = getDataParamMap(dateStr);
        // 验证data和sign
        verifyDataAndSign(dateStr, sign);
        String token = dataMap.get("TKNNBR");
        if (null == token) {
            throw Constants.ERROR_DATA_TOKEN_NOT_EXIST;
        }
        // 交互得到accessToken
        String format = "{\"token\":\"%s\",\"appId\":\"%s\"}";
        String body = String.format(format, token, baseReqInf.getAppId());
        if (baseReqInf.getWhrService()) {
            String companyId = dataMap.getOrDefault("enterpriseId", "TEMP0000");
            baseReqInf.setCompanyId(companyId);
        }
        String key = baseReqInf.getAuthoritySecret().substring(0, 32);

        //请求内容加密
        String secretMsg = Sm4Util.encryptEcb(key, body);
        Map<String, String> newRequestBodyMap = new HashMap<>(8);
        //secretMsg这个名称固定
        newRequestBodyMap.put("secretMsg", secretMsg);
        Gson gson = new Gson();
        body = gson.toJson(newRequestBodyMap);


        HttpResponseData responseData = XftOpenApiReqClient.doCommonPostReq(baseReqInf, accessTokenUrl, null, body);
        if (!responseData.isSuccess()) {
            throw Constants.ERROR_CHANGE_TOKEN;
        }
        String responseBody = responseData.getBody();
        responseBody = Sm4Util.decryptEcb(key, responseBody);
        XftFrameworkResponse xftFrameworkResponse = gson.fromJson(responseBody, XftFrameworkResponse.class);
        if (!xftFrameworkResponse.isSuccess()) {
            throw new XftSignException(xftFrameworkResponse.getReturnCode(), xftFrameworkResponse.getErrorMsg());
        }
        return gson.fromJson(gson.toJson(xftFrameworkResponse.getBody()), LoginTokenInfo.class);
    }

    private String getDataStr(final String data) {
        String dateStr = null;
        try {
            byte[] decode = Base64.decode(URLDecoder.decode(data, CHARSET_UTF8));
            if (null == decode) {
                decode = Base64.decode(data);
            }
            if (null == decode) {
                throw Constants.ERROR_DATA_ERROR;
            }
            dateStr = new String(decode);
        } catch (Exception e) {
            log.warn("data解析失败");
            return null;
        }
        return dateStr;
    }

    private Map<String, String> getDataParamMap(String dateStr) {
        if (null == dateStr) {
            return new HashMap<>();
        }
        // 可以分割"|"取得各个字段的值
        String[] params = dateStr.split(Constants.DATA_SPLIT_SYMBOL);
        Map<String, String> dataMap = new HashMap<>();
        for (String param : params) {
            int index = param.indexOf(Constants.EQUAL_SYMBOL);
            if (index > 0) {
                dataMap.put(param.substring(0, index), param.substring(index + 1));
            }
        }
        return dataMap;
    }

    private void verifyDataAndSign(String dataStr, String sign) throws XftSignException {
        String signal;
        try {
            String signStr = dataStr + "&" + baseReqInf.getAuthoritySecret();
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(signStr.getBytes(StandardCharsets.UTF_8));
            byte[] buffer = digest.digest();
            signal = Base64.encodeToString(buffer, false);
        } catch (NoSuchAlgorithmException e) {
            throw Constants.ERROR_SIGN_ERROR;
        }

        if (!sign.equals(signal)) {
            try {
                if (!URLDecoder.decode(sign, "UTF-8").equals(signal)) {
                    throw Constants.ERROR_SIGN_ERROR;
                }
            } catch (UnsupportedEncodingException e) {
                throw Constants.ERROR_SIGN_ERROR;
            }
        }
    }
}
