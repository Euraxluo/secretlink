import {toBase58} from "./base58";
import {ID_LENGTH} from "./constants";


// 将字符串转换为十六进制
function stringToHex(str: string): string {
    return Array.from(str).map(char => char.charCodeAt(0).toString(16).padStart(2, '0')).join('');
}

// 将十六进制转换回字符串
function hexToString(hex: string): string {
    return hex.match(/.{1,2}/g)?.map(byte => String.fromCharCode(parseInt(byte, 16))).join('') || '';
}

// 存储加密数据到 Uint8Array
export function storeEncryptedData(data: string): Uint8Array {
    const hex = stringToHex(data);
    const buffer = new Uint8Array(ID_LENGTH);
    for (let i = 0; i < hex.length && i < ID_LENGTH; i += 2) {
        buffer[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return buffer;
}

// 从 Uint8Array 提取加密数据
export function extractEncryptedData(buffer: Uint8Array): string {
    let endIndex = buffer.length;
    while (endIndex > 0 && buffer[endIndex - 1] === 0) {
        endIndex--;
    }
    const hex = Array.from(buffer.slice(0, endIndex), byte => byte.toString(16).padStart(2, '0')).join('');
    return hexToString(hex);
}