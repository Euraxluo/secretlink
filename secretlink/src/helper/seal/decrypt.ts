// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * 解密模块
 * 提供解密功能和相关工具，用于安全解密加密数据
 */

import { combine as externalCombine } from 'shamir-secret-sharing';

import type { EncryptedObject } from './bcs.js';
import type { G1Element } from './bls12381.js';
import { G2Element } from './bls12381.js';
import { AesGcm256, Hmac256Ctr } from './dem.js';
import { InvalidCiphertextError, UnsupportedFeatureError } from './error.js';
import { BonehFranklinBLS12381Services, DST } from './ibe.js';
import { deriveKey, KeyPurpose } from './kdf.js';
import type { KeyCacheKey } from './types.js';
import { createFullId } from './utils.js';

/**
 * 解密操作选项接口
 * @property encryptedObject - 要解密的加密对象
 * @property keys - 密钥缓存，包含用于解密的部分密钥
 */
export interface DecryptOptions {
	encryptedObject: typeof EncryptedObject.$inferType;
	keys: Map<KeyCacheKey, G1Element>;
}

/**
 * 使用给定的缓存密钥解密加密字节
 * 假设已经调用fetchKeys获取足够密钥服务器的密钥
 * 否则，将抛出错误
 *
 * @param encryptedObject - 要解密的加密对象
 * @param keys - 密钥缓存，包含用于解密的部分密钥
 * @returns 对应于密文的解密明文
 * @throws 如果密钥不足或解密失败
 */
export async function decrypt({ encryptedObject, keys }: DecryptOptions): Promise<Uint8Array> {
	if (!encryptedObject.encryptedShares.BonehFranklinBLS12381) {
		throw new UnsupportedFeatureError('不支持的加密模式');
	}

	const fullId = createFullId(DST, encryptedObject.packageId, encryptedObject.id);

	// 获取密钥存储中包含密钥的服务索引
	const inKeystore = encryptedObject.services
		.map((_, i) => i)
		.filter((i) => keys.has(`${fullId}:${encryptedObject.services[i][0]}`));

	if (inKeystore.length < encryptedObject.threshold) {
		throw new Error('密钥份额不足。请获取更多密钥。');
	}

	const encryptedShares = encryptedObject.encryptedShares.BonehFranklinBLS12381.encryptedShares;
	if (encryptedShares.length !== encryptedObject.services.length) {
		throw new InvalidCiphertextError(
			`份额数量不匹配：${encryptedShares.length} 份额，${encryptedObject.services.length} 服务`,
		);
	}

	const nonce = G2Element.fromBytes(encryptedObject.encryptedShares.BonehFranklinBLS12381.nonce);

	// 解密每个份额
	const shares = inKeystore.map((i: number) => {
		const [objectId, index] = encryptedObject.services[i];
		// 使用索引作为唯一信息参数，允许每个密钥服务器有多个份额
		const info = new Uint8Array([index]);
		const share = BonehFranklinBLS12381Services.decrypt(
			nonce,
			keys.get(`${fullId}:${objectId}`)!,
			encryptedShares[i],
			info,
		);
		// Shamir秘密共享库期望索引/x坐标在份额的末尾
		return { index, share };
	});

	// 将解密的份额组合成密钥
	const key = await combine(shares);
	const demKey = deriveKey(KeyPurpose.DEM, key);
	if (encryptedObject.ciphertext.Aes256Gcm) {
		try {
			// 使用密钥解密密文
			return AesGcm256.decrypt(demKey, encryptedObject.ciphertext);
		} catch {
			throw new Error('解密失败');
		}
	} else if (encryptedObject.ciphertext.Plain) {
		// 如果使用"Plain"模式，返回密钥
		return demKey;
	} else if (encryptedObject.ciphertext.Hmac256Ctr) {
		try {
			return Hmac256Ctr.decrypt(demKey, encryptedObject.ciphertext);
		} catch {
			throw new Error('解密失败');
		}
	} else {
		throw new Error('无效的加密对象');
	}
}

/**
 * 辅助函数，将份额组合成密钥
 * 使用Shamir秘密共享方案重建原始密钥
 * 
 * @param shares - 要组合的份额
 * @returns 组合后的密钥
 * @throws 如果份额数量无效
 */
async function combine(shares: { index: number; share: Uint8Array }[]): Promise<Uint8Array> {
	if (shares.length === 0) {
		throw new Error('无效的份额长度');
	} else if (shares.length === 1) {
		// Shamir秘密共享库期望至少有两个份额
		// 如果只有一个并且阈值为1，重建的秘密与份额相同
		return Promise.resolve(shares[0].share);
	}

	// Shamir秘密共享库期望索引/x坐标在份额的末尾
	return externalCombine(
		shares.map(({ index, share }) => {
			const packedShare = new Uint8Array(share.length + 1);
			packedShare.set(share, 0);
			packedShare[share.length] = index;
			return packedShare;
		}),
	);
}
