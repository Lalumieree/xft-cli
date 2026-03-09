package com.cmb.xft.open.api;

import com.google.gson.annotations.SerializedName;

import java.io.Serializable;
import java.util.List;

public class LoginUserInfo implements Serializable {
    /**
     *用户权限标志  0无权限 1有经办权限 2有查询权限
     */
    @SerializedName("AUTFLG")
    private String autFlg;
    /**
     * 访问Token 用户本应用最新的访问Token
     */
    @SerializedName("ACSTKN")
    private String acsTkn;
    /**
     * Token过期时间  秒值，如7200表示2小时后过期
     */
    @SerializedName("EXPTIM")
    private Long expTim;
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
     *企业用户号
     */
    @SerializedName("USRNBR")
    private String usrNbr;
    /**
     * 企业员工姓名
     */
    @SerializedName("USRNAM")
    private String usrNam;
    /**
     * 员工证件类型
     *'IDC', '大陆居民身份证', '#', NU
     *  'HMP', '港澳居民来往内地通行证',
     *  'TWP', '台湾居民来往大陆通行证',
     *  'T01', '港澳居民居住证', '#', NU
     *  'T03', '台湾居民居住证', '#', NU
     *  'PST', '外国护照', '#', NULL, '0
     *  'T05', '外国人永久居留身份证', '
     *  'T06', '外国人工作许可证（A类）'
     *  'T07', '外国人工作许可证（B类）'
     *  'T08', '外国人工作许可证（C类）'
     */
    @SerializedName("KEYTYP")
    private String keyTyp;
    /**
     * 员工证件号码
     */
    @SerializedName("KEYNBR")
    private String keyNbr;
    /**
     * 用户状态 A-活动 C-关闭 B-冻结
     */
    @SerializedName("USRSTS")
    private String usrSts;
    /**
     * 客户号
     */
    @SerializedName("CLTNBR")
    private String cltNbr;
    /**
     * 邮箱地址
     */
    @SerializedName("EMLADR")
    private String emlAdr;

    /**
     * 电话号码
     */
    @SerializedName("MBLNBR")
    private String mblNbr;
    /**
     * 用户类别  G集团用户 C企业用户 E 企业员工
     */
    @SerializedName("USRFLG")
    private String usrFlg;
    /**
     * 用户类型 P管理员 S普通用户
     */
    @SerializedName("USRTYP")
    private String usrTyp;
    /**
     * 会话访问Token  该Token用于应用系统通过交易OPSYTKCK来校验门户会话是否存在，如果不存在则会报错
     */
    @SerializedName("SEATKN")
    private String seaTkn;
    /**
     * 所属机构
     */
    @SerializedName("ORGSEQ")
    private String orgSeq;
//    /**
//     * 机构名称
//     */
//    @SerializedName("ORGNAM")
//    private String orgNam;
    /**
     * 企业员工ID -只有手机银行C端用户才有
     */
    @SerializedName("STFSEQ")
    private String stfSeq;
    /**
     * 企业员工工号
     */
    @SerializedName("STFNBR")
    private String stfnbr;
    /**
     * 企业员工名称 -	只有手机银行C端用户才有
     */
    @SerializedName("STFNAM")
    private String stfNam;
    /**
     * 	性别
     */
    @SerializedName("SEXFLG")
    private String sexFlg;
    /**
     * 对公统一用户ID
     */
    @SerializedName("COPUID")
    private String copUid;
    /**
     * 对公统一用户名称
     */
    @SerializedName("COPUNM")
    private String copUnm;
    /**
     * 平台个人用户ID
     */
    @SerializedName("USRUID")
    private String usrUid;

    public String getUsrUid() {
        return usrUid;
    }

    public void setUsrUid(String usrUid) {
        this.usrUid = usrUid;
    }

    public String getPrjCod() {
        return prjCod;
    }

    public void setPrjCod(String prjCod) {
        this.prjCod = prjCod;
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


    public String getStfSeq() {
        return stfSeq;
    }

    public void setStfSeq(String stfSeq) {
        this.stfSeq = stfSeq;
    }

    public String getStfnbr() {
        return stfnbr;
    }

    public void setStfnbr(String stfnbr) {
        this.stfnbr = stfnbr;
    }

    public String getAutFlg() {
        return autFlg;
    }

    public void setAutFlg(String autFlg) {
        this.autFlg = autFlg;
    }

    public String getAcsTkn() {
        return acsTkn;
    }

    public void setAcsTkn(String acsTkn) {
        this.acsTkn = acsTkn;
    }

    public Long getExpTim() {
        return expTim;
    }

    public void setExpTim(Long expTim) {
        this.expTim = expTim;
    }

    public String getPrjNam() {
        return prjNam;
    }

    public void setPrjNam(String prjNam) {
        this.prjNam = prjNam;
    }

    public String getKeyTyp() {
        return keyTyp;
    }

    public void setKeyTyp(String keyTyp) {
        this.keyTyp = keyTyp;
    }

    public String getKeyNbr() {
        return keyNbr;
    }

    public void setKeyNbr(String keyNbr) {
        this.keyNbr = keyNbr;
    }

    public String getUsrSts() {
        return usrSts;
    }

    public void setUsrSts(String usrSts) {
        this.usrSts = usrSts;
    }

    public String getCltNbr() {
        return cltNbr;
    }

    public void setCltNbr(String cltNbr) {
        this.cltNbr = cltNbr;
    }

    public String getEmlAdr() {
        return emlAdr;
    }

    public void setEmlAdr(String emlAdr) {
        this.emlAdr = emlAdr;
    }

    public String getUsrFlg() {
        return usrFlg;
    }

    public void setUsrFlg(String usrFlg) {
        this.usrFlg = usrFlg;
    }

    public String getUsrTyp() {
        return usrTyp;
    }

    public void setUsrTyp(String usrTyp) {
        this.usrTyp = usrTyp;
    }

    public String getSeaTkn() {
        return seaTkn;
    }

    public void setSeaTkn(String seaTkn) {
        this.seaTkn = seaTkn;
    }

    public String getOrgSeq() {
        return orgSeq;
    }

    public void setOrgSeq(String orgSeq) {
        this.orgSeq = orgSeq;
    }

//    public String getOrgNam() {
//        return orgNam;
//    }
//
//    public void setOrgNam(String orgNam) {
//        this.orgNam = orgNam;
//    }

    public String getStfNam() {
        return stfNam;
    }

    public void setStfNam(String stfNam) {
        this.stfNam = stfNam;
    }

    public String getSexFlg() {
        return sexFlg;
    }

    public void setSexFlg(String sexFlg) {
        this.sexFlg = sexFlg;
    }

    public String getCopUid() {
        return copUid;
    }

    public void setCopUid(String copUid) {
        this.copUid = copUid;
    }

    public String getCopUnm() {
        return copUnm;
    }

    public void setCopUnm(String copUnm) {
        this.copUnm = copUnm;
    }
    public String getMblNbr() {
        return mblNbr;
    }

    public void setMblNbr(String mblNbr) {
        this.mblNbr = mblNbr;
    }
}
