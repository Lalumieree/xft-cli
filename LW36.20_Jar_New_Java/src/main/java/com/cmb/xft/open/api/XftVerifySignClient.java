package com.cmb.xft.open.api;

import com.cmb.xft.open.utils.Base64;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.util.CollectionUtils;

import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.cmb.xft.open.api.Constants.SYCOMRETZ;

public class XftVerifySignClient {
    private static final Log log = LogFactory.getLog(XftVerifySignClient.class);
    private BaseReqInf baseReqInf;
    /**
     * 签名信息的有效时间（分钟），默认为5分钟
     */
    private Integer validMinute = 5;

    private String url;

    /**
     * 薪福通API请求客户端
     */
    public void setValidMinute(Integer validMinute) {
        this.validMinute = validMinute;
    }


    public XftVerifySignClient(BaseReqInf baseReqInf, String url) {
        this.url = url;
        this.baseReqInf = baseReqInf;
    }


    /**
     * 验证通过
     *
     * @param data URL参数-data
     * @param sign URL参数-Sign
     * @return 签名验证通过后 返回data中的登录用户信息
     */
    public LoginInfo verifySign(String data, String sign) throws Exception {
        // 对data先进行urldecode再进行base64decode
        String dateStr = null;
        Map<String, String> dataMap;
        try {
            dateStr = new String(Base64.decode(URLDecoder.decode(data, "UTF-8")));
            dataMap = getDataParamMap(dateStr);
        } catch (Exception e) {
            log.warn("data非url.encode格式");
            dateStr = new String(Base64.decode(data));
            dataMap = getDataParamMap(dateStr);
        }

        if (dateStr == null) {
            throw Constants.ERROR_DATA_ERROR;
        }

        // 校验时间是否超时，根据自己的需要来
        if (!isInValidTime(dataMap.get("REQTIM"))) {
            log.error("时间超时");
            throw Constants.ERROR_SIGN_EXPIRED;
        }
        getVerifyResult(dateStr, sign);
        String jsonBody = "{\"SYCOMOPAY\":[{\"SESTKN\":\"" + dataMap.get("TKNNBR") + "\",\"OPAUID\":\"" + this.baseReqInf.getAppId() + "\"}]}";
        String key = baseReqInf.getAuthoritySecret().substring(0, 32);
        //请求内容加密
        String secretMsg = Sm4Util.encryptEcb(key, jsonBody);
        Map<String, String> newRequestBodyMap = new HashMap<>(8);
        //secretMsg这个名称固定
        newRequestBodyMap.put("secretMsg", secretMsg);
        Gson gson = new Gson();
        jsonBody = gson.toJson(newRequestBodyMap);

        HttpResponseData responseData = XftOpenApiReqClient.doCommonPostReq(baseReqInf, url, null, jsonBody);
        String responseBody = responseData.getBody();
        responseBody = Sm4Util.decryptEcb(key, responseBody);
        return getLoginInfo(responseBody);

    }

    private LoginInfo getLoginInfo(String body) throws XftSignException {
        log.info("返回值:" + body);
        Gson gson = new Gson();
        LoginInfo loginInfo = new LoginInfo();
        Map<String, Object> map = gson.fromJson(body, Map.class);
        String errCode = "0000000";
        String errMsg = "0000000";
        if (map != null && map.containsKey(SYCOMRETZ)) {
            if (map.get(SYCOMRETZ) instanceof List) {
                List<Map> list = (List<Map>)map.get(SYCOMRETZ);
                if (!list.isEmpty()) {
                    errCode = list.get(0).get("ERRCOD").toString();
                    errMsg = list.get(0).get("ERRMSG").toString();
                }
            }
        }

        if (!"0000000".equals(errCode)) {
            throw new XftSignException(errCode, errMsg);
        }
        // 个人信息
        LoginUserInfo loginUserInfo = gson.fromJson(gson.toJson(((List)map.get("OPUSINFOY")).get(0)), LoginUserInfo.class);
        // 平台用户信息，在移动端场景下可能不存在
        if (map.get("OPUSRINFY") != null && !CollectionUtils.isEmpty((List)map.get("OPUSRINFY"))) {
            Map<String, Object> result = (Map<String, Object>)((List)map.get("OPUSRINFY")).get(0);
            loginUserInfo.setCopUid(StringUtils.valueOf(result.get("COPUID")));
            loginUserInfo.setCopUnm(StringUtils.valueOf(result.get("COPUNM")));
        }
        // 企业信息，在移动端场景下可能不存在
        if (map.get("OPPRJINFY") != null && !CollectionUtils.isEmpty((List)map.get("OPPRJINFY"))) {
            List<PrjInfo> prjInfoList = gson.fromJson(gson.toJson((map.get("OPPRJINFY"))), new TypeToken<List<PrjInfo>>() {
            }.getType());
            if (loginUserInfo.getUsrUid() == null) {
                loginUserInfo.setUsrUid(prjInfoList.get(0).getUsrUid());
            }
            loginInfo.setPrjInfoList(prjInfoList);
        }
        loginInfo.setLoginUserInfo(loginUserInfo);
        return loginInfo;
    }

    private Map<String, String> getDataParamMap(String dateStr) {
        // 可以分割"|"取得各个字段的值
        String[] params = dateStr.split("\\|");

        Map<String, String> dataMap = new HashMap<>();
        for (String param : params) {
            int index = param.indexOf('=');
            if (index > 0) {
                dataMap.put(param.substring(0, index), param.substring(index + 1));
            }
        }
        return dataMap;
    }

    private boolean isInValidTime(String reqTime) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(System.currentTimeMillis());
        calendar.add(Calendar.MINUTE, -validMinute);
        return Long.parseLong(reqTime) >= calendar.getTimeInMillis();
    }

    // sha-256
    private void getVerifyResult(String dataStr, String sign) throws XftSignException {
        String signal;
        try {
            String signStr = dataStr + "&" + baseReqInf.getAuthoritySecret();
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            digest.update(signStr.getBytes("UTF-8"));
            byte[] buffer = digest.digest();
            signal = Base64.encodeToString(buffer, false);
        } catch (NoSuchAlgorithmException | UnsupportedEncodingException e) {
            log.error("sha256签名生成失败", e);
            throw Constants.ERROR_SIGN_ERROR;
        }

        if (!sign.equals(signal)) {
            try {
                if (!URLDecoder.decode(sign, "UTF-8").equals(signal)) {
                    throw Constants.ERROR_SIGN_ERROR;
                }
            } catch (UnsupportedEncodingException e) {
                log.error("sign的格式不正确");
                throw Constants.ERROR_SIGN_ERROR;
            }
        }
    }
}
