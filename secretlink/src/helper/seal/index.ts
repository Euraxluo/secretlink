// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * 模块导出文件
 * 此文件仅导出SEAL库中与密码学操作直接相关的组件
 */
/**
 * 导出加密和解密功能
 */
export { encrypt, KemType, DemType } from './encrypt.js';
export { decrypt } from './decrypt.js';
export { elgamalDecrypt, generateSecretKey, toPublicKey, toVerificationKey } from './elgamal.js';

/**
 * 导出密码学原语和算法
 */
export { G1Element, G2Element, GTElement, Scalar } from './bls12381.js';
export { AesGcm256, Hmac256Ctr } from './dem.js';
export { BonehFranklinBLS12381Services } from './ibe.js';
export { deriveKey, KeyPurpose } from './kdf.js';

/**
 * 导出与密码学操作相关的BCS序列化类型
 */
export { IBEEncryptions, Ciphertext, EncryptedObject } from './bcs.js';

/**
 * 导出与密码学操作相关的类型
 */
export type { KeyCacheKey } from './types.js';

/**
 * 导出与密码学操作相关的错误类型
 */
export { 
  SealError, 
  UserError, 
  UnsupportedFeatureError, 
  InvalidCiphertextError, 
  InvalidThresholdError 
} from './error.js';