package com.cmb.xft.open.login.token;

/**
 * 账号信息
 */
public class LoginAccountInfo {
    /**
     * 平台账号状态:启用A/停用C/B密码锁定
     */
    private String accountStatus;
    /**
     * 平台账号ID，系统唯一
     */
    private String accountId;

    public String getAccountStatus() {
        return accountStatus;
    }

    public void setAccountStatus(final String accountStatus) {
        this.accountStatus = accountStatus;
    }

    public String getAccountId() {
        return accountId;
    }

    public void setAccountId(final String accountId) {
        this.accountId = accountId;
    }
}
