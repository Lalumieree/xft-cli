package com.cmb.xft.open.api;


import com.cmb.xft.open.login.token.LoginInfo;
import com.cmb.xft.open.login.token.LoginTokenInfo;
import com.google.gson.Gson;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.BlockJUnit4ClassRunner;

@RunWith(BlockJUnit4ClassRunner.class)
public class XftVerifyTokenClientTest {


    @Test(expected = Exception.class)
    public void testVerifySign_签名验证() throws Exception {
        String data =
                "VEtOTkJSPUNTQy01NzY3OTg4MjMyNDAtOUhPUmxMcTBsbElwRnpzR3h0cmlWTlYwa0lCcGZ1Y2FENkpOaDd2SWpxRUxJQnJWa0x8UkVRVElNPTE3MDM4MzAxMTUwOTd8T1BBVUlEPWI3NzczYjRjLWViN2UtNDI1OC05MmM4LWY1M2ZmMjQ5OTE4Zg%3D%3D";
        String sign = "niSXtZLZw1k16fyDmzrjIFzzXc7z663vXCK46nsF%2FCg%3D";
        /* 开放平台 appId*/
        String appId = "a8dbd9bd-50e5-4b9a-a057-1d2b47fee233";
        /* 开放平台 authoritySecret*/
        String authoritySecret = "2c7340e49f368445de408bd669e6a812c669cb1ab50dda24852d36d62ad9db36";

        //公共信息构建
        BaseReqInf baseReqInf = new BaseReqInf( appId, authoritySecret);

        XftVerifyTokenClient xftVerifyTokenClient =
                new XftVerifyTokenClient(baseReqInf, "https://api.cmburl.cn:8065/portal/common/uat2/xft-login-new/v1/access_token");
        try {
            LoginTokenInfo loginTokenInfo = xftVerifyTokenClient.verifyToken(data, sign);
            Gson gson = new Gson();
            System.out.println(gson.toJson(loginTokenInfo));
        } catch (Exception e) {
            System.out.println(e);
        }
    }

    @Test(expected = Exception.class)
    public void testGetUserInfo() throws Exception {
        String data =
                "VEtOTkJSPUNTQy0wOTIzOTAwOTAyMjItTVRFbVpweXlPQ3JrY0s0Mno5dmg1QkhLZHh4em5kVklTZGJ6VnAzcEdOajE5V2xvenV8UkVRVElNPTE3MDU1NjU5MjYwNTh8T1BBVUlEPWE4ZGJkOWJkLTUwZTUtNGI5YS1hMDU3LTFkMmI0N2ZlZTIzMw%3D%3D";
        String sign = "M9pBZuDB88HaSm52wIF6OGwbTBKZv2rvxoG1HFMHJz4%3D";

        /* 开放平台 appId*/
        String appId = "a8dbd9bd-50e5-4b9a-a057-1d2b47fee233";
        /* 开放平台 authoritySecret*/
        String authoritySecret = "2c7340e49f368445de408bd669e6a812c669cb1ab50dda24852d36d62ad9db36";

        //公共信息构建
        BaseReqInf baseReqInf = new BaseReqInf( appId, authoritySecret);

        XftVerifyTokenClient xftVerifyTokenClient =
                new XftVerifyTokenClient(baseReqInf, "https://api.cmburl.cn:8065/portal/common/uat2/xft-login-new/v1/access_token",
                        "https://api.cmburl.cn:8065/portal/common/uat2/xft-login-new/v1/user_info");
        LoginInfo loginInfoByToken = xftVerifyTokenClient.getLoginInfo(data, sign);
        Gson gson = new Gson();
        System.out.println(gson.toJson(loginInfoByToken));
    }

}
