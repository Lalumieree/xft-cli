package com.cmb.xft.open.api;

import java.io.Serializable;
import java.util.List;
import java.util.Map;

public class HttpResponseData implements Serializable {

    private static final long serialVersionUID = -6975537945058755923L;
    private static final int SUCCESS_HTTP_CODE = 200;
    /**
     * 返回的Body体
     */
    private String body;


    /**
     * Http状态码
     */
    private int httpStatusCode;

    private Map<String, List<String>> headers;

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public Map<String, List<String>> getHeaders() {
        return headers;
    }

    public void setHeaders(Map<String, List<String>> headers) {
        this.headers = headers;
    }

    public int getHttpStatusCode() {
        return httpStatusCode;
    }

    public void setHttpStatusCode(int httpStatusCode) {
        this.httpStatusCode = httpStatusCode;
    }

    public boolean isSuccess() {
        return SUCCESS_HTTP_CODE == httpStatusCode;
    }
}
