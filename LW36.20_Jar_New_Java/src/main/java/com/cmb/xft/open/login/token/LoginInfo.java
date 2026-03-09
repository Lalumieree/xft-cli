package com.cmb.xft.open.login.token;

/**
 * 登录信息
 */
public class LoginInfo {

    /**
     * 系统信息
     */
    private LoginSystemInfo systemInfo;
    /**
     * 平台账号信息
     */
    private LoginAccountInfo accountInfo;
    /**
     * 联系信息
     */
    private LoginContactInfo contactInfo;
    /**
     * 证件信息
     */
    private LoginCertificationInfo certificationInfo;
    /**
     * 企业用户信息
     */
    private LoginEnterpriseInfo enterpriseInfo;

    public LoginSystemInfo getSystemInfo() {
        return systemInfo;
    }

    public void setSystemInfo(final LoginSystemInfo systemInfo) {
        this.systemInfo = systemInfo;
    }

    public LoginAccountInfo getAccountInfo() {
        return accountInfo;
    }

    public void setAccountInfo(final LoginAccountInfo accountInfo) {
        this.accountInfo = accountInfo;
    }

    public LoginContactInfo getContactInfo() {
        return contactInfo;
    }

    public void setContactInfo(final LoginContactInfo contactInfo) {
        this.contactInfo = contactInfo;
    }

    public LoginCertificationInfo getCertificationInfo() {
        return certificationInfo;
    }

    public void setCertificationInfo(final LoginCertificationInfo certificationInfo) {
        this.certificationInfo = certificationInfo;
    }

    public LoginEnterpriseInfo getEnterpriseInfo() {
        return enterpriseInfo;
    }

    public void setEnterpriseInfo(final LoginEnterpriseInfo enterpriseInfo) {
        this.enterpriseInfo = enterpriseInfo;
    }
}
