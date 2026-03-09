package com.cmb.xft.open.api;

/**
 * @Author:yyf
 * @Descriptions:
 */
public class Constants {

    public static final XftSignException ERROR_DATA_TOKEN_NOT_EXIST = new XftSignException("XFT00006", "data不带有token");

    /**
     * 调用类型
     */
    public static final String API_TYPE_JAVA = "sdk-java";

    /**
     * SDK版本号
     */
    public static final String API_SDK_VERSION = "2.0.3-RELEASE";

    /**
     * 调用场景
     */
    public static final String API_SCENE_CUST = "cust";

    /**
     * UTF-8字符集
     **/
    public static final String CHARSET_UTF8 = "UTF-8";

    //文件流编码方式
    public static final String CHARSET_ISO = "ISO-8859-1";

    /**
     * HTTP请求相关
     **/
    public static final String METHOD_POST = "POST";

    public static final String METHOD_GET = "GET";

    public static final String METHOD_PUT = "PUT";

    public static final String TOP_HTTP_DNS_HOST = "TOP_HTTP_DNS_HOST";

    public static final int CONNECT_TIMEOUT = 15000; // 默认连接超时时间为15秒
    public static final int READ_TIMEOUT = 30000; // 默认响应超时时间为30秒

    /**
     * 响应转义方式
     * 1.直接按utf-8转义成字符串
     * 2.按文件流使用ISO-8859-1编码格式转义成文件编码
     */
    public static final String RESPONSE_TYPE_STRING = "STRING";
    public static final String RESPONSE_TYPE_BYTE = "BYTE";

    /**
     * 响应编码
     */
    public static final String ACCEPT_ENCODING = "Accept-Encoding";
    public static final String CONTENT_ENCODING_GZIP = "gzip";
    public static final String DATA_SPLIT_SYMBOL = "\\|";
    public static final char EQUAL_SYMBOL = '=';

    public static final String SYCOMRETZ = "SYCOMRETZ";
    public static final XftSignException ERROR_SIGN_EXPIRED = new XftSignException("XFT00001", "签名已过期");
    public static final XftSignException ERROR_VERIFY_EXCEPTION = new XftSignException("XFT00002", "验签发生异常");
    public static final XftSignException ERROR_DATA_ERROR = new XftSignException("XFT00003", "data格式不正确");
    public static final XftSignException ERROR_SIGN_ERROR = new XftSignException("XFT00007", "sign格式不正确");
    public static final XftSignException ERROR_APP_SECRET_ERROR = new XftSignException("XFT00004", "appSecret不正确");
    public static final XftSignException ERROR_SINGN_INCORRECT = new XftSignException("XFT00005", "签名不正确");
    public static final XftSignException ERROR_CHANGE_TOKEN = new XftSignException("XFT00007", "获取accessToken失败");
    public static final XftSignException ERROR_LOGIN_USER = new XftSignException("XFT00008", "获取登录信息失败");

    private Constants() {
    }

}
