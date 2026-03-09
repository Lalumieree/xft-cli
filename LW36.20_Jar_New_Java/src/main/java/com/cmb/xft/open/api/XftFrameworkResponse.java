package com.cmb.xft.open.api;

import java.io.Serializable;

public class XftFrameworkResponse implements Serializable {

    private static final long serialVersionUID = -6975537945058755923L;

    private static final String SUCCESS_CODE = "SUC0000";

    /**
     * 返回码
     */
    private String returnCode;
    /**
     * 错误信息
     */
    private String errorMsg;
    /**
     * 返回实体
     */
    private Object body;

    public String getReturnCode() {
        return returnCode;
    }

    public void setReturnCode(final String returnCode) {
        this.returnCode = returnCode;
    }

    public String getErrorMsg() {
        return errorMsg;
    }

    public void setErrorMsg(final String errorMsg) {
        this.errorMsg = errorMsg;
    }

    public Object getBody() {
        return body;
    }

    public void setBody(final Object body) {
        this.body = body;
    }

    public boolean isSuccess() {
        return SUCCESS_CODE.equals(returnCode);
    }
}
