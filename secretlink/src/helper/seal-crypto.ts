/**
 * Seal密码学工具 - 端到端加密实现
 * 基于Seal库的密码学函数，实现更高效的加密和更短的分享链接
 */

import { toBase58, fromBase58 } from './base58';
import { SecureContent } from '../components/ContextViewer';
import { Version } from '../config/constants';
// 导入Seal库中的DEM和KDF模块
import { AesGcm256, Hmac256Ctr } from './seal/dem';
import { deriveKey, KeyPurpose } from './seal/kdf';
import { encrypt, decrypt } from './seal/index';
import { hmac } from '@noble/hashes/hmac';
import { sha3_256 } from '@noble/hashes/sha3';

// 常量定义
const SEAL_PREFIX = 'sl';  // SecretLink前缀
const NONCE_SIZE = 12;     // 随机数大小
const KEY_SIZE = 32;       // 密钥大小
const INFO_STRING = 'SecretLink-v1'; // 密钥派生信息

/**
 * 生成随机密钥
 * @returns 随机生成的密钥
 */
export function generateRandomKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(KEY_SIZE));
}

/**
 * 生成随机nonce
 * @returns 随机生成的nonce
 */
export function generateNonce(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(NONCE_SIZE));
}

/**
 * 从主密钥派生加密密钥
 * @param masterKey 主密钥
 * @param salt 盐值
 * @returns 派生的加密密钥
 */
export async function deriveEncryptionKey(masterKey: Uint8Array, salt: Uint8Array): Promise<Uint8Array> {
  try {
    // 问题所在：没有使用salt参数，导致加密和解密时使用了不同的密钥
    // return deriveKey(KeyPurpose.DEM, masterKey);
    
    // 修复：使用info_string和salt作为派生上下文
    const info = new TextEncoder().encode(INFO_STRING);
    const combinedInfo = new Uint8Array(info.length + salt.length);
    combinedInfo.set(info, 0);
    combinedInfo.set(salt, info.length);
    
    // 使用HMAC-SHA3-256和combinedInfo进行密钥派生
    const hmacKey = deriveKey(KeyPurpose.DEM, masterKey);
    
    // 使用combinedInfo作为HMAC的消息
    return hmac(sha3_256, hmacKey, combinedInfo);
  } catch (error) {
    console.error('密钥派生失败:', error);
    throw new Error(`密钥派生失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 使用Seal的DEM模块加密数据
 * @param key 加密密钥
 * @param plaintext 明文数据
 * @param aad 额外认证数据
 * @returns 密文
 */
export async function encryptWithSeal(key: Uint8Array, plaintext: Uint8Array, aad?: Uint8Array): Promise<Uint8Array> {
  try {
    console.log(`准备加密数据，明文大小: ${plaintext.length} bytes`);
    
    // 使用AesGcm256加密
    const encryptionInput = new AesGcm256(plaintext, aad || new Uint8Array(0));
    const ciphertext = await encryptionInput.encrypt(key);
    
    // 检查加密结果
    console.log('加密结果对象类型:', typeof ciphertext);
    console.log('加密结果对象键:', Object.keys(ciphertext));
    
    // 将ciphertext对象直接转换为Uint8Array
    if (!('Aes256Gcm' in ciphertext)) {
      throw new Error('加密结果格式错误');
    }
    
    return new Uint8Array(ciphertext.Aes256Gcm.blob);
  } catch (error) {
    console.error('Seal加密失败:', error);
    throw new Error(`Seal加密失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 使用Seal的DEM模块解密数据
 * @param key 加密密钥
 * @param ciphertext 密文数据
 * @param aad 额外认证数据
 * @returns 明文
 */
export async function decryptWithSeal(key: Uint8Array, ciphertext: Uint8Array, aad?: Uint8Array): Promise<Uint8Array> {
  try {
    // 检查密文数据是否足够大
    if (ciphertext.length < 10) {
      throw new Error(`密文数据太小，无法解密: ${ciphertext.length} bytes`);
    }

    console.log(`开始解密数据，密文大小: ${ciphertext.length} bytes`);
    
    // 直接使用密文构造AesGcm256对象
    const ciphertextObj = {
      Aes256Gcm: {
        blob: Array.from(ciphertext),
        aad: aad ? Array.from(aad) : []
      }
    };
    
    // 使用AesGcm256解密
    console.log('使用AesGcm256解密数据...');
    const result = await AesGcm256.decrypt(key, ciphertextObj);
    console.log(`解密成功, 解密结果大小: ${result.length} bytes`);
    return result;
  } catch (error) {
    console.error('Seal解密失败:', error);
    // 记录更多调试信息
    console.error('密钥大小:', key.length);
    console.error('密文大小:', ciphertext.length);
    if (ciphertext.length > 0) {
      // 打印前几个字节帮助调试
      console.error('密文前10个字节:', Array.from(ciphertext.slice(0, 10)));
    }
    throw new Error(`Seal解密失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 优化的内容加密函数
 * 使用Seal库的密码学功能进行加密，生成较短的分享链接
 * @param content 待加密内容
 * @param onProgress 进度回调
 * @returns 加密结果和加密标识符
 */
export async function encryptContentWithSeal(
  content: SecureContent,
  onProgress?: (progress: number, message: string) => void
): Promise<{ encryptedData: Uint8Array, shareId: string }> {
  console.group('Seal优化加密过程');
  try {
    // 生成主密钥
    onProgress?.(10, '生成主密钥...');
    console.log('生成主密钥...');
    const masterKey = generateRandomKey();
    
    // 准备内容数据
    onProgress?.(20, '准备内容数据...');
    console.log('准备内容数据...');
    
    let contentType: string;
    let contentData: Uint8Array;
    
    if (content.type === 'file' && content.content instanceof Blob) {
      contentType = content.fileType || 'application/octet-stream';
      const buffer = await content.content.arrayBuffer();
      contentData = new Uint8Array(buffer);
      console.log(`处理文件类型: ${contentType}, 大小: ${contentData.length} bytes`);
    } else if (content.type === 'text') {
      contentType = 'text/plain';
      contentData = new TextEncoder().encode(content.content as string);
      console.log(`处理文本数据, 大小: ${contentData.length} bytes`);
    } else {
      throw new Error('不支持的内容类型');
    }
    
    // 序列化元数据
    onProgress?.(30, '序列化元数据...');
    console.log('序列化元数据...');
    const metadata = {
      type: content.type,
      contentType,
      fileName: content.type === 'file' ? content.fileName : undefined,
      timestamp: content.timestamp
    };
    const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
    
    // 生成随机nonce
    onProgress?.(40, '生成随机数...');
    console.log('生成随机nonce, 大小: 12 bytes');
    const nonce = generateNonce();
    
    // 派生加密密钥
    const encryptionKey = await deriveEncryptionKey(masterKey, nonce);
    console.log(`派生加密密钥成功, 大小: ${encryptionKey.length} bytes`);
    
    // 准备要加密的数据（元数据长度 + 元数据 + 内容）
    const metadataLength = new Uint8Array(4);
    new DataView(metadataLength.buffer).setUint32(0, metadataBytes.length, true);
    
    const dataToEncrypt = new Uint8Array(4 + metadataBytes.length + contentData.length);
    dataToEncrypt.set(metadataLength, 0);
    dataToEncrypt.set(metadataBytes, 4);
    dataToEncrypt.set(contentData, 4 + metadataBytes.length);
    
    console.log(`准备待加密数据, 总大小: ${dataToEncrypt.length} bytes`);
    
    // 加密数据
    onProgress?.(50, '加密数据...');
    console.log('使用Seal库加密数据...');
    const encryptedData = await encryptWithSeal(encryptionKey, dataToEncrypt);
    console.log(`加密完成, 密文大小: ${encryptedData.length} bytes`);
    
    // 创建完整的加密数据包
    onProgress?.(70, '生成加密数据包...');
    
    // 格式: 版本(1) + nonce长度(1) + nonce + 加密数据
    const packageData = new Uint8Array(2 + nonce.length + encryptedData.length);
    packageData[0] = Version;  // 使用当前版本号
    packageData[1] = nonce.length;
    packageData.set(nonce, 2);
    packageData.set(encryptedData, 2 + nonce.length);
    
    console.log(`生成最终数据包, 大小: ${packageData.length} bytes`);
    
    // 创建短分享ID - 只包含必要信息
    // 格式: 前缀 + Base58编码的主密钥
    onProgress?.(90, '生成短分享链接...');
    const shareId = SEAL_PREFIX + toBase58(masterKey);
    console.log(`生成分享ID: ${shareId}, 长度: ${shareId.length} 字符`);
    
    onProgress?.(100, '加密完成!');
    console.groupEnd();
    return { encryptedData: packageData, shareId };
  } catch (error) {
    console.error('Seal优化加密失败:', error);
    throw new Error(`Seal优化加密失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 使用Seal库解密内容
 * @param shareId 分享ID
 * @param encryptedData 加密数据
 * @param onProgress 进度回调
 * @returns 解密后的内容
 */
export async function decryptContentWithSeal(
  shareId: string,
  encryptedData: Uint8Array,
  onProgress?: (progress: number, message: string) => void
): Promise<SecureContent> {
  console.group('Seal优化解密过程');
  try {
    // 准备解密数据
    onProgress?.(10, '准备解密数据...');
    console.log('准备解密数据...');
    
    // 从分享ID中提取主密钥
    onProgress?.(20, '提取主密钥...');
    if (!shareId.startsWith(SEAL_PREFIX)) {
      throw new Error('无效的分享ID格式');
    }
    const masterKeyBase58 = shareId.slice(SEAL_PREFIX.length);
    let masterKey: Uint8Array;
    try {
      masterKey = fromBase58(masterKeyBase58);
    } catch (error) {
      throw new Error('无效的分享ID格式');
    }
    console.log('从分享ID中提取主密钥成功');
    
    if (encryptedData.length < 3) {
      throw new Error('加密数据太短');
    }
    
    // 从数据包中提取版本和nonce
    const version = encryptedData[0];
    if (version !== Version) {
      throw new Error(`不支持的版本号: ${version}`);
    }
    
    const nonceLength = encryptedData[1];
    if (nonceLength !== 12 || encryptedData.length < 2 + nonceLength) {
      throw new Error('无效的nonce长度');
    }
    
    const nonce = encryptedData.slice(2, 2 + nonceLength);
    const ciphertext = encryptedData.slice(2 + nonceLength);
    
    console.log(`版本: ${version}, nonce长度: ${nonceLength}, 密文长度: ${ciphertext.length}`);
    
    // 派生解密密钥
    onProgress?.(30, '派生解密密钥...');
    const decryptionKey = await deriveEncryptionKey(masterKey, nonce);
    console.log(`派生解密密钥成功, 大小: ${decryptionKey.length} bytes`);
    
    // 解密数据
    onProgress?.(50, '解密数据...');
    console.log('使用Seal库解密数据...');
    const decryptedData = await decryptWithSeal(decryptionKey, ciphertext);
    console.log(`解密完成, 明文大小: ${decryptedData.length} bytes`);
    
    // 解析元数据
    onProgress?.(70, '解析元数据...');
    if (decryptedData.length < 4) {
      throw new Error('解密数据太短，无法读取元数据长度');
    }
    
    const metadataLength = new DataView(decryptedData.buffer, decryptedData.byteOffset).getUint32(0, true);
    if (decryptedData.length < 4 + metadataLength) {
      throw new Error('解密数据长度不足，无法读取完整元数据');
    }
    
    const metadataBytes = decryptedData.slice(4, 4 + metadataLength);
    let metadata: any;
    try {
      metadata = JSON.parse(new TextDecoder().decode(metadataBytes));
    } catch (error) {
      throw new Error('元数据解析失败');
    }
    console.log('解析元数据成功:', metadata);
    
    // 提取内容数据
    const contentData = decryptedData.slice(4 + metadataLength);
    console.log(`提取内容数据, 大小: ${contentData.length} bytes`);
    
    // 构建SecureContent对象
    onProgress?.(90, '构建解密结果...');
    let content: string | Uint8Array;
    if (metadata.type === 'file') {
      content = contentData; // 直接返回Uint8Array而不是创建Blob
    } else if (metadata.type === 'text') {
      content = new TextDecoder().decode(contentData);
    } else {
      throw new Error('不支持的内容类型');
    }
    
    const secureContent: SecureContent = {
      type: metadata.type,
      content,
      timestamp: metadata.timestamp
    };
    
    if (metadata.type === 'file') {
      secureContent.fileName = metadata.fileName;
      secureContent.fileType = metadata.contentType;
    }
    
    onProgress?.(100, '解密完成!');
    console.groupEnd();
    return secureContent;
  } catch (error) {
    console.error('Seal优化解密失败:', error);
    throw new Error(`Seal优化解密失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
} 