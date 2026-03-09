package com.cmb.xft.open.api;

public class XftSignException extends Exception {
    public XftSignException(String errorCode, String errorMessage) {
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
    }

    public XftSignException(Throwable ex) {
        super(ex);
        this.errorCode = "000001";
        this.errorMessage = ex.getMessage();
    }

    /**
     * 错误编号
     */
    private String errorCode;
    /**
     * 错误消息
     */
    private String errorMessage;

    public String getErrorCode() {
        return errorCode;
    }

    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    @Override
    public String toString() {
        return String.format("XftSignException异常:错误码:%s,错误信息:%s", this.errorCode, this.errorMessage);
    }

}
