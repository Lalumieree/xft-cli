package com.cmb.xft.open.api;

import com.google.gson.annotations.SerializedName;

import java.io.Serializable;

public class PrjInfo implements Serializable {
    /**
     * 企业号
     */
    @SerializedName("PRJCOD")
    private String prjCod;
    /**
     * 企业名称
     */
    @SerializedName("PRJNAM")
    private String prjNam;
    /**
     * 个人用户ID
     */
    @SerializedName("USRUID")
    private String usrUid;
    /**
     * 员工号
     */
    @SerializedName("USRNBR")
    private String usrNbr;
    /**
     * 员工姓名
     */
    @SerializedName("USRNAM")
    private String usrNam;
    /**
     * 统一社会信用代码
     */
    @SerializedName("ORGCOD")
    private String orgCod;
    /**
     * 员工状态
     */
    @SerializedName("USRSTS")
    private String usrSts;
    /**
     * 员工类型 P管理员 S普通用户
     */
    @SerializedName("USRTYP")
    private String usrTyp;
    /**
     * 是否当前企业  Y是 N否
     */
    @SerializedName("PRJCUR")
    private String prjCur;
    /**
     * 异常信息
     */
    @SerializedName("ERRMSG")
    private String errMsg;
    /**
     * 是否超级用户  Y是 N否 一般创建者我们认为是超级用户
     */
    @SerializedName("SPRUSR")
    private String sprUsr;
    /**
     * 认证标记 	Y已认证 N未认证
     */
    @SerializedName("AUTLVL")
    private String autLvl;
    /**
     * 认证日期/审核日期
     */
    @SerializedName("AUTDAT")
    private String autDat;

    public String getPrjCod() {
        return prjCod;
    }

    public void setPrjCod(String prjCod) {
        this.prjCod = prjCod;
    }

    public String getPrjNam() {
        return prjNam;
    }

    public void setPrjNam(String prjNam) {
        this.prjNam = prjNam;
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

    public String getUsrNam() {
        return usrNam;
    }

    public void setUsrNam(String usrNam) {
        this.usrNam = usrNam;
    }

    public String getOrgCod() {
        return orgCod;
    }

    public void setOrgCod(String orgCod) {
        this.orgCod = orgCod;
    }

    public String getUsrSts() {
        return usrSts;
    }

    public void setUsrSts(String usrSts) {
        this.usrSts = usrSts;
    }

    public String getUsrTyp() {
        return usrTyp;
    }

    public void setUsrTyp(String usrTyp) {
        this.usrTyp = usrTyp;
    }

    public String getPrjCur() {
        return prjCur;
    }

    public void setPrjCur(String prjCur) {
        this.prjCur = prjCur;
    }

    public String getErrMsg() {
        return errMsg;
    }

    public void setErrMsg(String errMsg) {
        this.errMsg = errMsg;
    }

    public String getSprUsr() {
        return sprUsr;
    }

    public void setSprUsr(String sprUsr) {
        this.sprUsr = sprUsr;
    }

    public String getAutLvl() {
        return autLvl;
    }

    public void setAutLvl(String autLvl) {
        this.autLvl = autLvl;
    }

    public String getAutDat() {
        return autDat;
    }

    public void setAutDat(String autDat) {
        this.autDat = autDat;
    }
}
