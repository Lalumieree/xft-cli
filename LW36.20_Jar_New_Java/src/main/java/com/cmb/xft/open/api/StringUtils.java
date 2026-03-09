package com.cmb.xft.open.api;



public class StringUtils {


    private StringUtils() {
    }



    public static String valueOf(Object object) {
        return object == null ? null : object.toString();
    }
}
