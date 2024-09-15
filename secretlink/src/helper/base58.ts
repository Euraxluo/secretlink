import bs58 from 'bs58';

export const toBase58 = (b: Uint8Array) => bs58.encode(b);

export const fromBase58 = (s: string) => bs58.decode(s);


export const toBase64 = (b: Uint8Array): string => {
    const chunkSize = 0x8000; // 32KB chunks
    let result = '';
    for (let i = 0; i < b.length; i += chunkSize) {
        const chunk = b.subarray(i, i + chunkSize);
        result += String.fromCharCode.apply(null, chunk);
    }
    return btoa(result);
};

export const fromBase64 = (s: string): Uint8Array => {
    const binary = atob(s);
    const length = binary.length;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};