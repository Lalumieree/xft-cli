package com.cmb.xft.open.utils;

/**
 * @author 80280491
 * @date 2024/8/28
 */
public class NewByteUtils {

    private static final char[] HEX_CHARS = {'0', '1', '2', '3', '4', '5',
            '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'};

    /**
     * Convert a byte array to the corresponding hexstring.
     *
     * @param input the byte array to be converted
     * @return the corresponding hexstring
     */
    public static String toHexString(byte[] input) {
        StringBuilder result = new StringBuilder();
        for (int i = 0; i < input.length; i++) {
            result.append(HEX_CHARS[(input[i] >>> 4) & 0x0f]);
            result.append(HEX_CHARS[(input[i]) & 0x0f]);

        }
        return result.toString();
    }
}
