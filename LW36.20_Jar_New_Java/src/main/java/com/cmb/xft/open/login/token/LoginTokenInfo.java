package com.cmb.xft.open.login.token;

/**
 * token信息
 */
public class LoginTokenInfo {
    /**
     * 访问token
     */
    private String token;
    /**
     * 访问token的有效期，单位：秒
     */
    private int expire;
    /**
     * 平台账号ID，系统唯一
     */
    private String accountId;
    /**
     * 企业ID
     */
    private String enterpriseId;
    /**
     * 企业用户ID
     */
    private String enterpriseUserId;

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

    public String getAccountId() {
        return accountId;
    }

    public void setAccountId(final String accountId) {
        this.accountId = accountId;
    }

    public String getEnterpriseId() {
        return enterpriseId;
    }

    public void setEnterpriseId(final String enterpriseId) {
        this.enterpriseId = enterpriseId;
    }

    public String getEnterpriseUserId() {
        return enterpriseUserId;
    }

    public void setEnterpriseUserId(final String enterpriseUserId) {
        this.enterpriseUserId = enterpriseUserId;
    }
}
