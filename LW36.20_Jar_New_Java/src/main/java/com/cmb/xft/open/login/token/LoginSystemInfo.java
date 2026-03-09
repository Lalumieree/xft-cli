package com.cmb.xft.open.login.token;

/**
 * 系统信息
 */
public class LoginSystemInfo {
    /**
     * 访问token
     */
    private String token;
    /**
     * 访问token的有效期，单位：秒
     */
    private int expire;

    public String getToken() {
        return token;
    }

    public void setToken(final String token) {
        this.token = token;
    }

    public int getExpire() {
        return expire;
    }

    public void setExpire(final int expire) {
        this.expire = expire;
    }
}
