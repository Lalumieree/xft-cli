package com.cmb.xft.open.login.token;

/**
 * 证件信息
 */
public class LoginCertificationInfo {
    /**
     * 证件类型
     */
    private String certificationType;
    /**
     * 证件号码
     */
    private String certificationNumber;
    /**
     * 证件姓名
     */
    private String name;

    public String getCertificationType() {
        return certificationType;
    }

    public void setCertificationType(final String certificationType) {
        this.certificationType = certificationType;
    }

    public String getCertificationNumber() {
        return certificationNumber;
    }

    public void setCertificationNumber(final String certificationNumber) {
        this.certificationNumber = certificationNumber;
    }

    public String getName() {
        return name;
    }

    public void setName(final String name) {
        this.name = name;
    }
}
