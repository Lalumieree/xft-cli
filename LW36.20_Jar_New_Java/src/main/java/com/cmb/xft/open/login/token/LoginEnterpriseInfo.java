package com.cmb.xft.open.login.token;

/**
 * 企业信息
 */
public class LoginEnterpriseInfo {
    /**
     * 企业ID
     */
    private String enterpriseId;
    /**
     * 企业名称
     */
    private String enterpriseName;
    /**
     * 企业信用代码
     */
    private String enterpriseCreditCode;
    /**
     * 员工ID
     */
    private String enterpriseUserId;
    /**
     * 员工姓名
     */
    private String userName;
    /**
     * 用户类别，E 普通用户， S 业务管理员， P 超管
     */
    private String userType;
    /**
     * 用户职务，属于隐私信息
     */
    private String userPost;
    /**
     * 用户所属机构ID
     */
    private String userOrgId;
    /**
     * 用户所属机构名称，属于隐私信息
     */
    private String userOrgName;

    public String getEnterpriseId() {
        return enterpriseId;
    }

    public void setEnterpriseId(final String enterpriseId) {
        this.enterpriseId = enterpriseId;
    }

    public String getEnterpriseName() {
        return enterpriseName;
    }

    public void setEnterpriseName(final String enterpriseName) {
        this.enterpriseName = enterpriseName;
    }

    public String getEnterpriseCreditCode() {
        return enterpriseCreditCode;
    }

    public void setEnterpriseCreditCode(final String enterpriseCreditCode) {
        this.enterpriseCreditCode = enterpriseCreditCode;
    }

    public String getEnterpriseUserId() {
        return enterpriseUserId;
    }

    public void setEnterpriseUserId(final String enterpriseUserId) {
        this.enterpriseUserId = enterpriseUserId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(final String userName) {
        this.userName = userName;
    }

    public String getUserType() {
        return userType;
    }

    public void setUserType(final String userType) {
        this.userType = userType;
    }

    public String getUserPost() {
        return userPost;
    }

    public void setUserPost(final String userPost) {
        this.userPost = userPost;
    }

    public String getUserOrgId() {
        return userOrgId;
    }

    public void setUserOrgId(final String userOrgId) {
        this.userOrgId = userOrgId;
    }

    public String getUserOrgName() {
        return userOrgName;
    }

    public void setUserOrgName(final String userOrgName) {
        this.userOrgName = userOrgName;
    }
}
