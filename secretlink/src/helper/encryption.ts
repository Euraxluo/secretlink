import { fromBase58, fromBase64} from "./base58";
import {SecureContent} from "../components/ContextViewer";
import {Version} from "../config/constants";

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
    console.group('encryptSecureContent 详细日志')
    console.log(`开始加密内容，类型: ${content.type}`)
    try {
        console.log('生成加密密钥...')
        const key = await generateKey();
        console.log('密钥生成成功')
        
        console.log('生成初始化向量(IV)...')
        const iv = crypto.getRandomValues(new Uint8Array(16));
        console.log(`IV生成成功，长度: ${iv.length} bytes`)

        let dataToEncrypt: ArrayBuffer;

        console.log('准备加密数据...')
        if (content.type === 'file' && content.content instanceof Blob) {
            console.log(`处理文件类型内容，大小: ${content.content.size} bytes, 类型: ${content.content.type || '未知'}`)
            try {
                dataToEncrypt = await content.content.arrayBuffer();
                console.log(`文件已转换为ArrayBuffer，大小: ${dataToEncrypt.byteLength} bytes`)
            } catch (err) {
                console.error('文件转换ArrayBuffer失败:', err)
                throw new Error(`文件转换失败: ${err instanceof Error ? err.message : '未知错误'}`)
            }
        } else if (content.type === 'text') {
            console.log(`处理文本类型内容，长度: ${typeof content.content === 'string' ? content.content.length : '未知'} 字符`)
            try {
                dataToEncrypt = new TextEncoder().encode(content.content as string);
                console.log(`文本已转换为ArrayBuffer，大小: ${dataToEncrypt.byteLength} bytes`)
            } catch (err) {
                console.error('文本转换ArrayBuffer失败:', err)
                throw new Error(`文本转换失败: ${err instanceof Error ? err.message : '未知错误'}`)
            }
        } else {
            console.error(`无效的内容类型: ${content.type}，或格式不正确`)
            throw new Error('Invalid content type or format');
        }

        // 创建一个包含元数据的对象
        console.log('创建元数据对象...')
        const metadataObject = {
            version: 2, // 新版本号
            type: content.type,
            fileType: content.fileType,
            fileName: content.fileName,
            timestamp: content.timestamp
        };
        console.log('元数据对象:', metadataObject);

        // 将元数据对象转换为 JSON 字符串，然后转换为 ArrayBuffer
        let metadataString, metadataBuffer;
        try {
            metadataString = JSON.stringify(metadataObject);
            console.log(`元数据JSON字符串长度: ${metadataString.length} 字符`)
            metadataBuffer = new TextEncoder().encode(metadataString);
            console.log(`元数据Buffer长度: ${metadataBuffer.byteLength} bytes`)
        } catch (err) {
            console.error('元数据转换失败:', err)
            throw new Error(`元数据转换失败: ${err instanceof Error ? err.message : '未知错误'}`)
        }

        // 创建一个 4 字节的 buffer 来存储元数据长度
        console.log('创建元数据长度Buffer...')
        const metadataLengthBuffer = new ArrayBuffer(4);
        new DataView(metadataLengthBuffer).setUint32(0, metadataBuffer.byteLength, true);
        console.log(`元数据长度Buffer大小: ${metadataLengthBuffer.byteLength} bytes`)

        // 合并所有部分：元数据长度 + 元数据 + 实际数据
        console.log('合并所有数据组件...')
        try {
            const totalLength = 4 + metadataBuffer.byteLength + dataToEncrypt.byteLength;
            console.log(`合并数据总长度: ${totalLength} bytes`)
            
            const combinedBuffer = new Uint8Array(totalLength);
            console.log(`已创建合并Buffer，大小: ${combinedBuffer.byteLength} bytes`)
            
            combinedBuffer.set(new Uint8Array(metadataLengthBuffer), 0);
            combinedBuffer.set(new Uint8Array(metadataBuffer), 4);
            combinedBuffer.set(new Uint8Array(dataToEncrypt), 4 + metadataBuffer.byteLength);
            console.log('数据组件合并完成')
            
            console.log('元数据长度Buffer部分:', metadataLengthBuffer.byteLength, 'bytes')
            console.log('元数据Buffer部分:', metadataBuffer.byteLength, 'bytes')
            console.log('数据部分:', dataToEncrypt.byteLength, 'bytes')
            console.log('合并后总Buffer:', combinedBuffer.byteLength, 'bytes')
            
            // 加密合并后的数据
            console.log('开始执行AES-GCM加密...')
            let encryptedBuffer;
            try {
                encryptedBuffer = await crypto.subtle.encrypt(
                    {
                        name: "AES-GCM",
                        iv,
                    },
                    key,
                    combinedBuffer
                );
                console.log(`加密成功，加密后大小: ${encryptedBuffer.byteLength} bytes`)
            } catch (encryptErr) {
                console.error('加密过程失败:', encryptErr)
                throw new Error(`加密过程失败: ${encryptErr instanceof Error ? encryptErr.message : '未知错误'}`)
            }
            
            console.log('导出加密密钥...')
            const exportedKey = await crypto.subtle.exportKey("raw", key);
            console.log(`密钥导出成功，大小: ${exportedKey.byteLength} bytes`)
            
            console.log('encryptSecureContent 完成')
            console.groupEnd()
            return {
                encrypted: new Uint8Array(encryptedBuffer),
                key: new Uint8Array(exportedKey),
                iv,
            };
        } catch (combineErr) {
            console.error('合并或加密数据失败:', combineErr)
            throw new Error(`合并或加密数据失败: ${combineErr instanceof Error ? combineErr.message : '未知错误'}`)
        }
    } catch (error) {
        console.error('encryptSecureContent 失败:', error)
        console.groupEnd()
        throw error
    }
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
    console.group('encryptAndPrepareForUpload 详细日志')
    try {
        // Step 1: Encrypt the content
        console.log('第1步: 开始加密内容')
        onProgress?.(0, "Starting encryption process");
        
        let encrypted, iv, key;
        try {
            const result = await encryptSecureContent(content);
            encrypted = result.encrypted;
            iv = result.iv;
            key = result.key;
            console.log(`加密成功，加密数据大小: ${encrypted.length} bytes, IV大小: ${iv.length} bytes, 密钥大小: ${key.length} bytes`)
        } catch (encryptError) {
            console.error('内容加密失败:', encryptError)
            throw encryptError
        }
        onProgress?.(30, "Content encrypted successfully");

        // Step 2: Prepare the encrypted data for storage
        console.log('第2步: 准备存储加密数据')
        onProgress?.(40, "Preparing encrypted data for storage");
        
        try {
            console.log(`创建头部，版本: ${Version}`)
            const header = new Uint8Array([Version]); // Version 1
            console.log(`创建IV长度Buffer`)
            const ivLengthBuffer = new Uint8Array(4);
            new DataView(ivLengthBuffer.buffer).setUint32(0, iv.length, true);

            // Combine all parts: header + IV length + IV + encrypted data
            const totalLength = header.length + ivLengthBuffer.length + iv.length + encrypted.length;
            console.log(`计算总长度: ${totalLength} bytes`)
            
            console.log(`创建合并Buffer`)
            const combinedBuffer = new Uint8Array(totalLength);
            let offset = 0;

            onProgress?.(50, "Combining encrypted data components");
            console.log(`合并数据组件...`)
            
            combinedBuffer.set(header, offset);
            offset += header.length;
            console.log(`已合并头部, 新偏移量: ${offset}`)
            
            combinedBuffer.set(ivLengthBuffer, offset);
            offset += ivLengthBuffer.length;
            console.log(`已合并IV长度, 新偏移量: ${offset}`)
            
            combinedBuffer.set(iv, offset);
            offset += iv.length;
            console.log(`已合并IV, 新偏移量: ${offset}`)

            // Set encrypted data in chunks to allow for progress updates
            console.log(`开始分块合并加密数据...`)
            const chunkSize = 1024 * 1024; // 1MB chunks
            let chunkCount = 0;
            for (let i = 0; i < encrypted.length; i += chunkSize) {
                const chunk = encrypted.subarray(i, Math.min(i + chunkSize, encrypted.length));
                combinedBuffer.set(chunk, offset + i);
                const progress = 50 + (i / encrypted.length) * 40;
                chunkCount++;
                console.log(`已合并第${chunkCount}块数据, 大小: ${chunk.length} bytes, 总进度: ${progress.toFixed(2)}%`)
                onProgress?.(progress, `Combining encrypted data: ${(progress - 50).toFixed(2)}%`);
            }
            console.log(`加密数据合并完成，总块数: ${chunkCount}`)

            // Create Blob
            console.log(`创建最终Blob...`)
            onProgress?.(90, "Creating final encrypted blob");
            const blob = new Blob([combinedBuffer], {type: 'application/octet-stream'});
            console.log(`Blob创建成功，大小: ${blob.size} bytes, 类型: ${blob.type}`)
            onProgress?.(100, "Encryption and preparation complete");

            console.log('encryptAndPrepareForUpload 完成')
            console.groupEnd()
            return {blob, key};
        } catch (prepareError) {
            console.error('准备加密数据失败:', prepareError)
            throw prepareError
        }
    } catch (error) {
        console.error('Encryption failed:', error);
        onProgress?.(0, "Encryption process failed");
        console.groupEnd()
        throw new Error(`Encryption process failed: ${error instanceof Error ? error.message : '未知错误'}`);
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