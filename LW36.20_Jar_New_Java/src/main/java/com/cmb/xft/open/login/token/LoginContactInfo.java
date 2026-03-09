package com.cmb.xft.open.login.token;

/**
 * 联系信息
 */
public class LoginContactInfo {
    /**
     * 手机号，属于隐私信息
     */
    private String mobile;
    /**
     * 邮箱，属于隐私信息
     */
    private String email;

    public String getMobile() {
        return mobile;
    }

    public void setMobile(final String mobile) {
        this.mobile = mobile;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(final String email) {
        this.email = email;
    }
}
