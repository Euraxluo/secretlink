// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * 数据加密机制(DEM)模块
 * 提供对称加密算法实现，用于加密实际数据
 * 包括AES-GCM和基于HMAC的CTR模式
 */

import { bcs } from '@mysten/bcs';
import { equalBytes } from '@noble/curves/abstract/utils';
import { hmac } from '@noble/hashes/hmac';
import { sha3_256 } from '@noble/hashes/sha3';

import type { Ciphertext } from './bcs.js';
import { InvalidCiphertextError } from './error.js';
import { xorUnchecked } from './utils.js';

/**
 * AES加密的固定初始化向量(IV)
 * 在AES-GCM模式中使用
 */
export const iv = Uint8Array.from([
	138, 55, 153, 253, 198, 46, 121, 219, 160, 128, 89, 7, 214, 156, 148, 220,
]);

/**
 * 生成AES密钥
 * 使用浏览器的Web Crypto API生成256位AES密钥
 * @returns 生成的AES密钥字节数组
 */
async function generateAesKey(): Promise<Uint8Array> {
	const key = await crypto.subtle.generateKey(
		{
			name: 'AES-GCM',
			length: 256,
		},
		true,
		['encrypt', 'decrypt'],
	);
	return await crypto.subtle.exportKey('raw', key).then((keyData) => new Uint8Array(keyData));
}

/**
 * 加密输入接口
 * 定义了加密模式需要实现的方法
 */
export interface EncryptionInput {
	/**
	 * 使用给定密钥加密数据
	 * @param key - 加密密钥
	 * @returns 加密后的密文对象
	 */
	encrypt(key: Uint8Array): Promise<typeof Ciphertext.$inferInput>;
	
	/**
	 * 生成适用于该加密方式的随机密钥
	 * @returns 生成的密钥
	 */
	generateKey(): Promise<Uint8Array>;
}

/**
 * AES-GCM 256位加密实现
 * 使用AES-GCM模式进行加密和解密
 */
export class AesGcm256 implements EncryptionInput {
	readonly plaintext: Uint8Array;
	readonly aad: Uint8Array;

	/**
	 * 创建AES-GCM加密实例
	 * @param msg - 要加密的明文
	 * @param aad - 额外认证数据(Additional Authenticated Data)
	 */
	constructor(msg: Uint8Array, aad: Uint8Array) {
		this.plaintext = msg;
		this.aad = aad;
	}

	/**
	 * 生成AES密钥
	 * @returns 生成的AES密钥
	 */
	generateKey(): Promise<Uint8Array> {
		return generateAesKey();
	}

	/**
	 * 使用AES-GCM模式加密数据
	 * @param key - 加密密钥
	 * @returns 加密后的密文对象
	 */
	async encrypt(key: Uint8Array): Promise<typeof Ciphertext.$inferInput> {
		const aesCryptoKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);

		const blob = new Uint8Array(
			await crypto.subtle.encrypt(
				{
					name: 'AES-GCM',
					iv,
					additionalData: this.aad,
				},
				aesCryptoKey,
				this.plaintext,
			),
		);

		return {
			Aes256Gcm: {
				blob,
				aad: this.aad ?? [],
			},
		};
	}

	/**
	 * 使用AES-GCM模式解密数据
	 * @param key - 解密密钥
	 * @param ciphertext - 密文对象
	 * @returns 解密后的明文
	 * @throws 如果密文格式无效或解密失败
	 */
	static async decrypt(
		key: Uint8Array,
		ciphertext: typeof Ciphertext.$inferInput,
	): Promise<Uint8Array> {
		if (!('Aes256Gcm' in ciphertext)) {
			throw new InvalidCiphertextError(`无效的密文 ${ciphertext}`);
		}

		const aesCryptoKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']);

		return new Uint8Array(
			await crypto.subtle.decrypt(
				{
					name: 'AES-GCM',
					iv,
					additionalData: new Uint8Array(ciphertext.Aes256Gcm.aad ?? []),
				},
				aesCryptoKey,
				new Uint8Array(ciphertext.Aes256Gcm.blob),
			),
		);
	}
}

/**
 * 明文模式实现
 * 不进行实际加密，用于测试或特殊场景
 */
export class Plain implements EncryptionInput {
	/**
	 * "加密"操作，实际返回明文标记
	 * @param _key - 未使用的密钥
	 * @returns 明文类型的密文对象
	 */
	async encrypt(_key: Uint8Array): Promise<typeof Ciphertext.$inferInput> {
		return {
			Plain: {},
		};
	}

	/**
	 * 生成AES密钥(虽然不会用于加密)
	 * @returns 生成的AES密钥
	 */
	generateKey(): Promise<Uint8Array> {
		return generateAesKey();
	}
}

/**
 * 基于HMAC-SHA3-256的CTR模式认证加密
 * 实现流程：
 * 1. 派生加密密钥 k₁ = hmac(key, 1)
 * 2. 将消息分成32字节的块，m = m₁ || ... || mₙ
 * 3. 密文定义为 c = c₁ || ... || cₙ，其中 cᵢ = mᵢ ⊕ hmac(k₁, i)
 * 4. 计算AAD和密文上的MAC：mac = hmac(k₂, aad || c)，其中 k₂ = hmac(key, 2)
 * 5. 返回 mac || c
 */
export class Hmac256Ctr implements EncryptionInput {
	readonly plaintext: Uint8Array;
	readonly aad: Uint8Array;

	/**
	 * 创建HMAC-CTR加密实例
	 * @param msg - 要加密的明文
	 * @param aad - 额外认证数据
	 */
	constructor(msg: Uint8Array, aad: Uint8Array) {
		this.plaintext = msg;
		this.aad = aad;
	}

	/**
	 * 生成AES密钥(用作HMAC的密钥)
	 * @returns 生成的密钥
	 */
	generateKey(): Promise<Uint8Array> {
		return generateAesKey();
	}

	/**
	 * 使用HMAC-CTR模式加密数据
	 * @param key - 加密密钥
	 * @returns 加密后的密文对象，包含密文、MAC和AAD
	 */
	async encrypt(key: Uint8Array): Promise<typeof Ciphertext.$inferInput> {
		const blob = Hmac256Ctr.encryptInCtrMode(key, this.plaintext);
		const mac = Hmac256Ctr.computeMac(key, this.aad, blob);
		return {
			Hmac256Ctr: {
				blob,
				mac,
				aad: this.aad ?? [],
			},
		};
	}

	/**
	 * 使用HMAC-CTR模式解密数据
	 * @param key - 解密密钥
	 * @param ciphertext - 密文对象
	 * @returns 解密后的明文
	 * @throws 如果MAC验证失败或密文格式无效
	 */
	static async decrypt(
		key: Uint8Array,
		ciphertext: typeof Ciphertext.$inferInput,
	): Promise<Uint8Array> {
		if (!('Hmac256Ctr' in ciphertext)) {
			throw new InvalidCiphertextError(`无效的密文 ${ciphertext}`);
		}
		const aad = new Uint8Array(ciphertext.Hmac256Ctr.aad ?? []);
		const blob = new Uint8Array(ciphertext.Hmac256Ctr.blob);
		const mac = Hmac256Ctr.computeMac(key, aad, blob);
		if (!equalBytes(mac, new Uint8Array(ciphertext.Hmac256Ctr.mac))) {
			throw new InvalidCiphertextError(`无效的MAC ${mac}`);
		}
		return Hmac256Ctr.encryptInCtrMode(key, blob);
	}

	/**
	 * 计算MAC(消息认证码)
	 * @param key - HMAC密钥
	 * @param aad - 额外认证数据
	 * @param ciphertext - 密文数据
	 * @returns 计算得到的MAC
	 */
	private static computeMac(key: Uint8Array, aad: Uint8Array, ciphertext: Uint8Array): Uint8Array {
		const macKey = hmac(sha3_256, key, MacKeyTag);
		const macInput = new Uint8Array([...toBytes(aad.length), ...aad, ...ciphertext]);
		const mac = hmac(sha3_256, macKey, macInput);
		return mac;
	}

	/**
	 * CTR模式加密/解密实现
	 * 注：CTR模式的加密和解密操作相同
	 * @param key - 密钥
	 * @param msg - 要处理的消息(加密时为明文，解密时为密文)
	 * @returns 处理后的结果(加密时为密文，解密时为明文)
	 */
	private static encryptInCtrMode(key: Uint8Array, msg: Uint8Array): Uint8Array {
		const blockSize = 32;
		let result = Uint8Array.from({ length: msg.length }, () => 0);
		const encryptionKey = hmac(sha3_256, key, EncryptionKeyTag);
		for (let i = 0; i * blockSize < msg.length; i++) {
			const block = msg.slice(i * blockSize, (i + 1) * blockSize);
			let mask = hmac(sha3_256, encryptionKey, toBytes(i));
			const encryptedBlock = xorUnchecked(block, mask);
			result.set(encryptedBlock, i * blockSize);
		}
		return result;
	}
}

/**
 * 将64位无符号整数转换为字节数组，使用小端序表示
 * @param n - 要转换的整数
 * @returns 表示该整数的字节数组
 */
function toBytes(n: number): Uint8Array {
	return bcs.u64().serialize(n).toBytes();
}

/**
 * 用于派生加密密钥的标签
 */
const EncryptionKeyTag = new Uint8Array([1]);

/**
 * 用于派生MAC密钥的标签
 */
const MacKeyTag = new Uint8Array([2]);
