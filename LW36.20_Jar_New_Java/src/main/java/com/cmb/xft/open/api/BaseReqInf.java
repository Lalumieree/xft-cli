package com.cmb.xft.open.api;

public class BaseReqInf {
    private String companyId;

    private String edsCompanyId;

    private String usrUid;

    private String usrNbr;

    private String appId;

    private String authoritySecret;

    private boolean whrService = false;

    public String getCompanyId() {
        return companyId;
    }

    public void setCompanyId(String companyId) {
        this.companyId = companyId;
    }

    public String getEdsCompanyId() {
        return edsCompanyId;
    }

    public void setEdsCompanyId(String edsCompanyId) {
        this.edsCompanyId = edsCompanyId;
    }


    public String getUsrUid() {
        return usrUid;
    }

    public void setUsrUid(String usrUid) {
        this.usrUid = usrUid;
    }

    public String getUsrNbr() {
        return usrNbr;
    }

    public void setUsrNbr(String usrNbr) {
        this.usrNbr = usrNbr;
    }


    public String getAuthoritySecret() {
        return authoritySecret;
    }

    public void setAuthoritySecret(String openAppSecret) {
        this.authoritySecret = openAppSecret;
    }

    public String getAppId() {
        return appId;
    }

    public void setAppId(String appId) {
        this.appId = appId;
    }


    public BaseReqInf() {
    }

    public BaseReqInf(String companyId, String appId, String authoritySecret) {
        this.companyId = companyId;
        this.appId = appId;
        this.authoritySecret = authoritySecret;
    }

    public BaseReqInf(String appId, String authoritySecret) {
        this.appId = appId;
        this.authoritySecret = authoritySecret;
    }

    public void setWhrService(boolean flag) {
        this.whrService = flag;
    }

    public boolean getWhrService() {
        return this.whrService;
    }
}
