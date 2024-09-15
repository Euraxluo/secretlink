import { fromBase58, fromBase64} from "./base58";
import {SecureContent} from "../ContextViewer";
import {Version} from "./constants";

export async function generateKey() {
    return await crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 128,
        },
        true,
        ["encrypt", "decrypt"]
    );
}
// http://localhost:5173/Gt4F3RwWWc8UzZ88gMpG5myHkgwLgJ5hPyZiiV7mVP3zkzkuasS6XYEaTEw9AUzQGmDtzpxLwAfnC4KcfRutYA1NNj9FRrh8V1KN5A2mpRH47yFPuc89bb8QnxZae8rXh9VKzeNdPG2jkGLowxFD5MK6CrjAs5zjEqPWZEQ58AzWDKc4cQNMhJQQCcp8wrMuBvhuoHSLrKq1jiTTEphtH4198gCBKBub4fAeYA25g8g7oPvnTox5N2D8fWYWBWetxpZreQ7AQC2SCBKS6teg1W3agZKxoZveJjXrue1pEzZ1NfDR1y9S45QsJcVJA4Kt4f3k8mCM2p5W2cpSXjcwELR88F1B79aH5bH8EYP1NHJ5CUDEfH5v
export async function encryptSecureContent(content: SecureContent): Promise<{
    encrypted: Uint8Array;
    iv: Uint8Array;
    key: Uint8Array
}> {
    const key = await generateKey();
    const iv = crypto.getRandomValues(new Uint8Array(16));

    let dataToEncrypt: ArrayBuffer;

    if (content.type === 'file' && content.content instanceof Blob) {
        dataToEncrypt = await content.content.arrayBuffer();
    } else if (content.type === 'text') {
        dataToEncrypt = new TextEncoder().encode(content.content as string);
    } else {
        throw new Error('Invalid content type or format');
    }

    // 创建一个包含元数据的对象
    const metadataObject = {
        version: 2, // 新版本号
        type: content.type,
        fileType: content.fileType,
        fileName: content.fileName,
        timestamp: content.timestamp
    };
    console.log('Metadata object:', metadataObject);

    // 将元数据对象转换为 JSON 字符串，然后转换为 ArrayBuffer
    const metadataString = JSON.stringify(metadataObject);
    const metadataBuffer = new TextEncoder().encode(metadataString);

    console.log('Metadata buffer:', metadataBuffer.length);

    // 创建一个 4 字节的 buffer 来存储元数据长度
    const metadataLengthBuffer = new ArrayBuffer(4);
    new DataView(metadataLengthBuffer).setUint32(0, metadataBuffer.byteLength, true);

    // 合并所有部分：元数据长度 + 元数据 + 实际数据
    const combinedBuffer = new Uint8Array(4 + metadataBuffer.byteLength + dataToEncrypt.byteLength);
    combinedBuffer.set(new Uint8Array(metadataLengthBuffer), 0);
    combinedBuffer.set(new Uint8Array(metadataBuffer), 4);
    combinedBuffer.set(new Uint8Array(dataToEncrypt), 4 + metadataBuffer.byteLength);
    console.log('Combined metadataLengthBuffer:', metadataLengthBuffer.byteLength);
    console.log('Combined metadataBuffer:', metadataBuffer.byteLength);
    console.log('Combined dataToEncrypt:', dataToEncrypt.byteLength);
    console.log('Combined combinedBuffer:', combinedBuffer.byteLength);
    // 加密合并后的数据
    const encryptedBuffer = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv,
        },
        key,
        combinedBuffer
    );
    console.log('Encrypted buffer:', encryptedBuffer.byteLength);
    const exportedKey = await crypto.subtle.exportKey("raw", key);
    return {
        encrypted: new Uint8Array(encryptedBuffer),
        key: new Uint8Array(exportedKey),
        iv,
    };
}


/**
 * 加密并且存储密文上传
 * @param content
 * @param onProgress
 */
export async function encryptAndPrepareForUpload(
    content: SecureContent,
    onProgress?: (progress: number, message: string) => void
): Promise<{ blob: Blob, key: Uint8Array }> {
    try {
        // Step 1: Encrypt the content
        onProgress?.(0, "Starting encryption process");
        const {encrypted, iv, key} = await encryptSecureContent(content);
        onProgress?.(30, "Content encrypted successfully");

        // Step 2: Prepare the encrypted data for storage
        onProgress?.(40, "Preparing encrypted data for storage");
        const header = new Uint8Array([Version]); // Version 1
        const ivLengthBuffer = new Uint8Array(4);
        new DataView(ivLengthBuffer.buffer).setUint32(0, iv.length, true);

        // Combine all parts: header + IV length + IV + encrypted data
        const totalLength = header.length + ivLengthBuffer.length + iv.length + encrypted.length;
        const combinedBuffer = new Uint8Array(totalLength);
        let offset = 0;

        onProgress?.(50, "Combining encrypted data components");
        combinedBuffer.set(header, offset);
        offset += header.length;
        combinedBuffer.set(ivLengthBuffer, offset);
        offset += ivLengthBuffer.length;
        combinedBuffer.set(iv, offset);
        offset += iv.length;

        // Set encrypted data in chunks to allow for progress updates
        const chunkSize = 1024 * 1024; // 1MB chunks
        for (let i = 0; i < encrypted.length; i += chunkSize) {
            const chunk = encrypted.subarray(i, Math.min(i + chunkSize, encrypted.length));
            combinedBuffer.set(chunk, offset + i);
            const progress = 50 + (i / encrypted.length) * 40;
            onProgress?.(progress, `Combining encrypted data: ${(progress - 50).toFixed(2)}%`);
        }

        // Create Blob
        onProgress?.(90, "Creating final encrypted blob");
        const blob = new Blob([combinedBuffer], {type: 'application/octet-stream'});
        onProgress?.(100, "Encryption and preparation complete");

        return {blob, key};
    } catch (error) {
        console.error('Encryption failed:', error);
        onProgress?.(0, "Encryption process failed");
        throw new Error('Encryption process failed');
    }
}

/**
 * 解密上传的密文
 * @param blob
 * @param key
 * @param onProgress
 */
export async function decryptUploadedContent(
    blob: Blob,
    key: Uint8Array,
    onProgress?: (progress: number, message: string) => void
): Promise<SecureContent> {
    try {
        onProgress?.(0, "Starting decryption process");
        const arrayBuffer = await blob.arrayBuffer();
        const dataView = new DataView(arrayBuffer);

        // Read version
        const version = dataView.getUint8(0);
        onProgress?.(10, `Detected version: ${version}`);
        if (version !== Version) {
            throw new Error('Unsupported version');
        }

        // Read IV length
        const ivLength = dataView.getUint32(1, true);
        onProgress?.(20, "Reading initialization vector");

        // Extract IV
        const iv = new Uint8Array(arrayBuffer.slice(5, 5 + ivLength));

        // Extract encrypted data
        const encryptedData = new Uint8Array(arrayBuffer.slice(5 + ivLength));
        onProgress?.(30, "Extracted encrypted data");

        // Decrypt data
        onProgress?.(40, "Starting decryption");
        const decrypted = await crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            await crypto.subtle.importKey("raw", key, {name: "AES-GCM", length: 256}, false, ["decrypt"]),
            encryptedData
        );
        onProgress?.(70, "Data decrypted successfully");

        const metadataLength = (new DataView(decrypted)).getUint32(0, true);
        const metadataBuffer = decrypted.slice(4, 4 + metadataLength);
        const metadata = JSON.parse(new TextDecoder().decode(metadataBuffer));
        onProgress?.(80, "Metadata extracted and parsed");

        // 新格式
        const contentBuffer = decrypted.slice(4 + metadataLength);
        let content: string | Blob;

        onProgress?.(90, `Processing decrypted ${metadata.type} content`);
        if (metadata.type === 'file') {
            // 将 ArrayBuffer 转换为 Blob
            content = new Blob([contentBuffer], {type: metadata.fileType || 'application/octet-stream'});
        } else {
            content = new TextDecoder().decode(contentBuffer);
        }

        onProgress?.(100, "Decryption and content processing complete");

        return {
            type: metadata.type,
            content: content,
            fileType: metadata.fileType,
            fileName: metadata.fileName,
            timestamp: metadata.timestamp
        };

    } catch (error) {
        console.error('Decryption failed:', error);
        onProgress?.(0, "Decryption process failed");
        throw new Error('Decryption process failed');
    }
}

export async function encryptDemo(text: string): Promise<{ encrypted: Uint8Array; iv: Uint8Array; key: Uint8Array }> {
    const key = await generateKey();

    const iv = crypto.getRandomValues(new Uint8Array(16));

    const encryptedBuffer = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv,
        },
        key,
        new TextEncoder().encode(text)
    );

    const exportedKey = await crypto.subtle.exportKey("raw", key);
    return {
        encrypted: new Uint8Array(encryptedBuffer),
        key: new Uint8Array(exportedKey),
        iv,
    };
}

export async function decryptDemo(encrypted: string, keyData: Uint8Array, iv: string, keyVersion: number): Promise<string> {
    const algorithm = keyVersion === 1 ? "AES-CBC" : "AES-GCM";
    console.log("decrypt algorithm", algorithm)
    const key = await crypto.subtle.importKey("raw", keyData, {name: algorithm, length: 128}, false, ["decrypt"]);
    console.log("decrypt key", key)
    const decrypted = await crypto.subtle.decrypt(
        {
            name: algorithm,
            iv: fromBase58(iv),
        },
        key,
        fromBase58(encrypted)
    );
    console.log("decrypt decrypted", decrypted)
    return new TextDecoder().decode(decrypted);
}