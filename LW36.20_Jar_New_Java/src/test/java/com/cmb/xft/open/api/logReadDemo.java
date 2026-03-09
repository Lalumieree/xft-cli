package com.cmb.xft.open.api;
import com.cmb.xft.open.utils.Base64;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.BlockJUnit4ClassRunner;

import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;


/**
 * @author 80280491
 * @date 2024/7/11
 */
@RunWith(BlockJUnit4ClassRunner.class)
public class logReadDemo {
    @Test
    public void read() throws Exception {
        Gson gson = new Gson();

        try (FileInputStream file = new FileInputStream("C:\\Users\\80280491\\Desktop\\新建文件夹\\Log20240711140837.json");
             BufferedReader reader = new BufferedReader(new InputStreamReader(file))
        ) {
            StringBuilder content = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                content.append(line);
            }

            TypeToken<List<Map>> token = new com.google.gson.reflect.TypeToken<List<Map>>() {
            };
            List<Map> list = gson.fromJson(content.toString(), token.getType());
            list.forEach(item -> {
                String message = item.get("message").toString();
                //加密耗时和请求返回值长度：daff005b-8c92-45f7-89b1-81aa91465705,31973,100062（应用id，耗时，返回字节数）
                String[] subMessage = message.split("：");
                String[] contents = subMessage[1].split(",");
                System.out.println(String.join(",", Arrays.asList(contents)));
            });
            // List<Map<String,Object>>results = gson.fromJson()
        } catch (IOException e) {
            System.out.println("读取失败");
        }
    }
}
