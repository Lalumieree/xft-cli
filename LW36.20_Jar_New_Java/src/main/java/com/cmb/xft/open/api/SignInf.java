package com.cmb.xft.open.api;

public class SignInf {
    private String timestamp;
    private String url;
    private String path;
    public SignInf(String timestamp, String url, String path) {
        this.timestamp = timestamp;
        this.url = url;
        this.path = path;
    }

    public SignInf() {
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }
}
