package com.cmb.xft.open.api;

import java.io.Serializable;
import java.util.List;

public class LoginInfo implements Serializable {
    /**
     * 登录用户信息
     */
    private LoginUserInfo loginUserInfo;

    /**
     * 当前登录用户加入的企业列表
     */
    private List<PrjInfo> prjInfoList;

    public LoginUserInfo getLoginUserInfo() {
        return loginUserInfo;
    }

    public void setLoginUserInfo(LoginUserInfo loginUserInfo) {
        this.loginUserInfo = loginUserInfo;
    }

    public List<PrjInfo> getPrjInfoList() {
        return prjInfoList;
    }

    public void setPrjInfoList(List<PrjInfo> prjInfoList) {
        this.prjInfoList = prjInfoList;
    }
}
