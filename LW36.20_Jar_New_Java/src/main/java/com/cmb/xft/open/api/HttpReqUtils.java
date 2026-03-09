package com.cmb.xft.open.api;

import com.google.gson.Gson;

import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSession;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.Reader;
import java.net.HttpURLConnection;
import java.net.Proxy;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.zip.GZIPInputStream;

/**
 * @Author:yyf
 * @Descriptions:
 */
public class HttpReqUtils {

    private static final String DEFAULT_CHARSET = Constants.CHARSET_UTF8;

    // 忽略SSL检查
    private static final boolean ignoreSSLCheck = true;

    // 忽略HOST检查
    private static final boolean ignoreHostCheck = true;

    protected static HttpResponseData doPost(String url, Map<String, Object> params, String charset, int connectTimeout, int readTimeout,
                                             Map<String, String> headerMap, Proxy proxy) throws IOException {
        String ctype = "application/json; charset=" + charset;
        byte[] content = {};
        if (null != params) {
            Gson gson = new Gson();
            content = gson.toJson(params).getBytes(charset);
        }
        return execByType(url, ctype, content, connectTimeout, readTimeout, headerMap, proxy, Constants.METHOD_POST, Constants.RESPONSE_TYPE_STRING);
    }

    protected static HttpResponseData doFileUpload(String url, Map<String, String> queryParams, String fileName, byte[] bytes,
                                                   Map<String, String> headerMap, String responseType) throws IOException {
        final String NEWLINE = "\r\n";
        final String PREFIX = "--";
        final String BOUNDARY = "---------" + System.nanoTime();

        HttpURLConnection conn = null;
        OutputStream out = null;
        String rsp = null;
        HttpResponseData data = new HttpResponseData();
        try {
            String ctype = "multipart/form-data; charset=" + Constants.CHARSET_UTF8 + "; boundary=" + BOUNDARY;

            conn = getConnection(new URL(url), Constants.METHOD_POST, ctype, headerMap, null);
            conn.setConnectTimeout(Constants.CONNECT_TIMEOUT);
            conn.setReadTimeout(Constants.READ_TIMEOUT);
            out = conn.getOutputStream();

            byte[] entryBoundaryBytes = (PREFIX + BOUNDARY + NEWLINE).getBytes(StandardCharsets.UTF_8);

            //发送文本参数
            if (null != queryParams) {
                Set<Map.Entry<String, String>> textEntrySet = queryParams.entrySet();
                for (Map.Entry<String, String> textEntry : textEntrySet) {
                    byte[] textBytes = convertFileData(textEntry.getKey(), textEntry.getValue(), Constants.CHARSET_UTF8);
                    out.write(entryBoundaryBytes);
                    out.write(textBytes);
                }
            }

            //发送数据流
            if (null != fileName && null != bytes) {
                out.write(entryBoundaryBytes);
                out.write(("Content-Disposition: form-data; name=\"file\"; filename=\""
                        + fileName + "\"" + NEWLINE).getBytes(StandardCharsets.UTF_8));
                out.write(NEWLINE.getBytes(StandardCharsets.UTF_8));
                out.write(bytes);
                out.write(NEWLINE.getBytes(StandardCharsets.UTF_8));
            }

            // 添加请求结束标志
            byte[] endBoundaryBytes = (PREFIX + BOUNDARY + PREFIX + NEWLINE).getBytes(StandardCharsets.UTF_8);
            out.write(endBoundaryBytes);
            out.flush();
            if (Constants.RESPONSE_TYPE_STRING.equals(responseType)) {
                rsp = getResponseAsString(conn);
            } else {
                rsp = getResponseBytes(conn);
            }
            data.setBody(rsp);
            data.setHeaders(conn.getHeaderFields());
            data.setHttpStatusCode(conn.getResponseCode());
        } finally {
            if (out != null) {
                out.close();
            }
            if (conn != null) {
                conn.disconnect();
            }
        }

        return data;
    }

    private static byte[] convertFileData(String fieldName, String fieldValue, String charset) throws IOException {
        StringBuilder entry = new StringBuilder();
        entry.append("Content-Disposition: form-data; name=\"");
        entry.append(fieldName);
        entry.append("\"\r\n\r\n");
        entry.append(fieldValue);
        entry.append("\r\n");
        return entry.toString().getBytes(charset);
    }

    private static HttpURLConnection getConnection(URL url, String method, String ctype, Map<String, String> headerMap, Proxy proxy)
            throws IOException {
        HttpURLConnection conn = proxy == null ? (HttpURLConnection)url.openConnection() : (HttpURLConnection)url.openConnection(proxy);
        if (conn instanceof HttpsURLConnection) {
            HttpsURLConnection connHttps = (HttpsURLConnection)conn;
            if (ignoreSSLCheck) {
                try {
                    SSLContext ctx = SSLContext.getInstance("TLSv1.2");
                    ctx.init(null, new TrustManager[]{new TrustAllTrustManager()}, new SecureRandom());
                    connHttps.setSSLSocketFactory(ctx.getSocketFactory());
                    connHttps.setHostnameVerifier(new HostnameVerifier() {
                        @Override
                        public boolean verify(String hostname, SSLSession session) {
                            return hostname.equalsIgnoreCase(session.getPeerHost());
                        }
                    });
                } catch (Exception e) {
                    throw new IOException(e.toString());
                }
            } else if (ignoreHostCheck) {
                connHttps.setHostnameVerifier(new HostnameVerifier() {
                    @Override
                    public boolean verify(String hostname, SSLSession session) {
                        return hostname.equalsIgnoreCase(session.getPeerHost());
                    }
                });
            }
            conn = connHttps;
        }

        conn.setRequestMethod(method);
        conn.setDoInput(true);
        conn.setDoOutput(true);
        conn.setRequestProperty("Accept", "application/json,text/xml,text/javascript");

        conn.setRequestProperty("XFT-API-Call-Type", Constants.API_TYPE_JAVA);
        conn.setRequestProperty("XFT-API-SDK-Version", Constants.API_SDK_VERSION);
        conn.setRequestProperty("XFT-API-Scene", Constants.API_SCENE_CUST);
        conn.setRequestProperty("Content-Type", ctype);
        if (headerMap != null) {
            conn.setRequestProperty("Host",
                    headerMap.get(Constants.TOP_HTTP_DNS_HOST) != null ? headerMap.get(Constants.TOP_HTTP_DNS_HOST) : url.getHost());
            for (Map.Entry<String, String> entry : headerMap.entrySet()) {
                if (!Constants.TOP_HTTP_DNS_HOST.equals(entry.getKey())) {
                    conn.setRequestProperty(entry.getKey(), entry.getValue());
                }
            }
        }
        return conn;
    }

    protected static HttpResponseData doPut(String url, Map<String, Object> params, String charset, int connectTimeout, int readTimeout,
                                            Map<String, String> headerMap, Proxy proxy) throws IOException {
        String ctype = "application/json; charset=" + charset;
        byte[] content = {};
        if (null != params) {
            Gson gson = new Gson();
            content = gson.toJson(params).getBytes(charset);
        }
        return execByType(url, ctype, content, connectTimeout, readTimeout, headerMap, proxy, Constants.METHOD_PUT, Constants.RESPONSE_TYPE_STRING);
    }

    protected static HttpResponseData doGet(String url, Map<String, String> paramsMap, String charset, int connectTimeout, int readTimeout,
                                            Map<String, String> headerMap, Proxy proxy) throws IOException {
        HttpURLConnection conn = null;
        String rsp = null;
        HttpResponseData data = new HttpResponseData();
        try {
            String ctype = "application/json; charset=" + charset;
            String query = buildQuery(paramsMap, charset);
            conn = getConnection(buildGetUrl(url, query), Constants.METHOD_GET, ctype, headerMap, proxy);
            conn.setConnectTimeout(connectTimeout);
            conn.setReadTimeout(readTimeout);
            rsp = getResponseAsString(conn);
            data.setBody(rsp);
            data.setHttpStatusCode(conn.getResponseCode());
            Map<String, List<String>> headerFields = conn.getHeaderFields();
            Map<String, List<String>> nonNullHeaderMap = new HashMap<>();
            Iterator<Map.Entry<String, List<String>>> it = headerFields.entrySet().iterator();
            while (it.hasNext()) {
                Map.Entry<String, List<String>> entry = it.next();
                String k = entry.getKey();
                List<String> v = entry.getValue();
                if (k != null && !k.isEmpty()) {
                    nonNullHeaderMap.put(k, v);
                }
            }
            data.setHeaders(nonNullHeaderMap);
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }

        return data;
    }

    private static URL buildGetUrl(String url, String query) throws IOException {
        if (query == null || "".equals(query)) {
            return new URL(url);
        }

        return new URL(buildRequestUrl(url, query));
    }

    private static String buildRequestUrl(String url, String... queries) {
        if (queries == null || queries.length == 0) {
            return url;
        }

        StringBuilder newUrl = new StringBuilder(url);
        boolean hasQuery = url.contains("?");
        boolean hasPrepend = url.endsWith("?") || url.endsWith("&");

        for (String query : queries) {
            if (query != null && !"".equals(query)) {
                if (!hasPrepend) {
                    if (hasQuery) {
                        newUrl.append("&");
                    } else {
                        newUrl.append("?");
                        hasQuery = true;
                    }
                }
                newUrl.append(query);
                hasPrepend = false;
            }
        }
        return newUrl.toString();
    }

    private static String buildQuery(Map<String, String> params, String charset) throws IOException {
        if (params == null || params.isEmpty()) {
            return null;
        }

        StringBuilder query = new StringBuilder();
        Set<Map.Entry<String, String>> entries = params.entrySet();
        boolean hasParam = false;

        for (Map.Entry<String, String> entry : entries) {
            String name = entry.getKey();
            String value = entry.getValue();

            // 忽略参数名或参数值为空的参数
            if (name != null && !"".equals(name) && value != null) {
                if (hasParam) {
                    query.append("&");
                } else {
                    hasParam = true;
                }
                query.append(name).append("=").append(URLEncoder.encode(value, charset));
            }
        }

        return query.toString();
    }

    public static HttpResponseData execByType(String url, String ctype, byte[] content, int connectTimeout,
                                              int readTimeout, Map<String, String> headerMap, Proxy proxy, String reqType, String responseType)
            throws IOException {
        HttpURLConnection conn = null;
        OutputStream out = null;
        String rsp = null;
        HttpResponseData data = new HttpResponseData();
        try {
            conn = getConnection(new URL(url), reqType, ctype, headerMap, proxy);
            conn.setConnectTimeout(connectTimeout);
            conn.setReadTimeout(readTimeout);
            //如果使用conn.getOutputStream()方法，会造成get请求被更改为post请求
            if (null != content) {
                out = conn.getOutputStream();
                out.write(content);
            }
            if (Constants.RESPONSE_TYPE_STRING.equals(responseType)) {
                rsp = getResponseAsString(conn);
            } else {
                rsp = getResponseBytes(conn);
            }
            data.setBody(rsp);
            data.setHttpStatusCode(conn.getResponseCode());
            Map<String, List<String>> headerFields = conn.getHeaderFields();
            Map<String, List<String>> nonNullHeaderMap = new HashMap<>();
            Iterator<Map.Entry<String, List<String>>> it = headerFields.entrySet().iterator();
            while (it.hasNext()) {
                Map.Entry<String, List<String>> entry = it.next();
                String k = entry.getKey();
                List<String> v = entry.getValue();
                if (k != null && !k.isEmpty()) {
                    nonNullHeaderMap.put(k, v);
                }
            }
            data.setHeaders(nonNullHeaderMap);
        } finally {
            if (out != null) {
                out.close();
            }
            if (conn != null) {
                conn.disconnect();
            }
        }

        return data;
    }

    private static String getResponseAsString(HttpURLConnection conn) throws IOException {
        String charset = getResponseCharset(conn.getContentType());
        if (conn.getResponseCode() < HttpURLConnection.HTTP_BAD_REQUEST) {
            String contentEncoding = conn.getContentEncoding();
            if (Constants.CONTENT_ENCODING_GZIP.equalsIgnoreCase(contentEncoding)) {
                return getStreamAsString(new GZIPInputStream(conn.getInputStream()), charset);
            } else {
                return getStreamAsString(conn.getInputStream(), charset);
            }
        } else {
            InputStream error = conn.getErrorStream();
            // OAuth bad request always return 400 status
            if (conn.getResponseCode() == HttpURLConnection.HTTP_BAD_REQUEST && error != null) {
                return getStreamAsString(error, charset);
            }
            // Client Error 4xx and Server Error 5xx
            return getStreamAsString(conn.getErrorStream(), charset);
        }
    }

    public static HttpResponseData doFileDownload(String url, Map<String, Object> params,
                                                  Map<String, String> headerMap, String responseType, String reqType) throws IOException {
        String ctype = "application/json; charset=" + Constants.CHARSET_UTF8;
        byte[] content = {};
        if (null != params) {
            Gson gson = new Gson();
            content = gson.toJson(params).getBytes(StandardCharsets.UTF_8);
        }
        if (Constants.METHOD_GET.equals(reqType)) {
            return execByType(url, ctype, null, Constants.CONNECT_TIMEOUT, Constants.READ_TIMEOUT, headerMap, null, Constants.METHOD_GET,
                    responseType);
        } else {
            return execByType(url, ctype, content, Constants.CONNECT_TIMEOUT, Constants.READ_TIMEOUT, headerMap, null, Constants.METHOD_POST,
                    responseType);
        }
    }

    protected static String getResponseBytes(HttpURLConnection conn) throws IOException {
        String charset = getResponseCharset(conn.getContentType());
        if (conn.getResponseCode() < HttpURLConnection.HTTP_BAD_REQUEST) {
            String contentEncoding = conn.getContentEncoding();
            if (Constants.CONTENT_ENCODING_GZIP.equalsIgnoreCase(contentEncoding)) {
                return getStreamBytes(new GZIPInputStream(conn.getInputStream()));
            } else {
                return getStreamBytes(conn.getInputStream());
            }
        } else {
            InputStream error = conn.getErrorStream();
            // OAuth bad request always return 400 status
            if (conn.getResponseCode() == HttpURLConnection.HTTP_BAD_REQUEST && error != null) {
                return getStreamAsString(error, charset);
            }
            // Client Error 4xx and Server Error 5xx
            throw new IOException(conn.getResponseCode() + " " + getStreamAsString(error, charset));
        }
    }

    private static String getStreamBytes(InputStream stream) throws IOException {
        try {
            StringBuilder response = new StringBuilder();
            byte[] buff = new byte[1024];
            int read;
            while ((read = stream.read(buff)) > 0) {
                byte[] tem = new byte[read];
                System.arraycopy(buff, 0, tem, 0, read);
                response.append(new String(tem, Constants.CHARSET_ISO));
            }
            return response.toString();
        } finally {
            if (stream != null) {
                stream.close();
            }
        }
    }

    private static String getResponseCharset(String ctype) {
        String charset = DEFAULT_CHARSET;

        if (ctype != null && !"".equals(ctype)) {
            String[] params = ctype.split(";");
            for (String param : params) {
                param = param.trim();
                if (param.startsWith("charset")) {
                    String[] pair = param.split("=", 2);
                    if (pair.length == 2 && pair[1] != null && !"".equals(pair[1])) {
                        charset = pair[1].trim();
                    }
                    break;
                }
            }
        }

        return charset;
    }

    private static String getStreamAsString(InputStream stream, String charset) throws IOException {
        try (Reader reader = new InputStreamReader(stream, charset)) {
            StringBuilder response = new StringBuilder();
            final char[] buff = new char[1024];
            int read = 0;
            while ((read = reader.read(buff)) > 0) {
                response.append(buff, 0, read);
            }

            return response.toString();
        } finally {
            if (stream != null) {
                stream.close();
            }
        }
    }


    private static class TrustAllTrustManager implements X509TrustManager {
        @Override
        public void checkClientTrusted(X509Certificate[] x509Certificates, String s) {
        }

        @Override
        public void checkServerTrusted(X509Certificate[] x509Certificates, String s) {
        }

        public X509Certificate[] getAcceptedIssuers() {
            return null;
        }
    }
}
