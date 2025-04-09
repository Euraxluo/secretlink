// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * 密钥派生函数(KDF)模块
 * 提供从初始密钥材料安全派生加密密钥的功能
 */

import { hkdf } from '@noble/hashes/hkdf';
import { hmac } from '@noble/hashes/hmac';
import { sha3_256 } from '@noble/hashes/sha3';

import type { GTElement } from './bls12381.js';

/**
 * 默认密钥派生函数
 * 使用HKDF(基于HMAC的密钥派生函数)从GT元素派生密钥
 *
 * @param element - 用于派生密钥的GT元素(配对结果)
 * @param info - 可选的上下文和应用特定信息，增加派生密钥的随机性
 * @returns 派生的密钥(32字节)
 */
export function kdf(element: GTElement, info: Uint8Array): Uint8Array {
	// 这个置换翻转GT元素中6对系数的顺序
	// 置换可以计算为:
	// for i in 0..3 {
	//   for j in 0..2 {
	//     PERMUTATION[i + j * 3] = i * 2 + j;
	//   }
	// }
	const GT_ELEMENT_BYTE_LENGTH = 576;
	const PERMUTATION = [0, 2, 4, 1, 3, 5];
	const COEFFICIENT_SIZE = GT_ELEMENT_BYTE_LENGTH / PERMUTATION.length;

	const bytes = element.toBytes();
	let permutedBytes = new Uint8Array(GT_ELEMENT_BYTE_LENGTH);
	PERMUTATION.forEach((pi, i) => {
		permutedBytes.set(
			bytes.slice(i * COEFFICIENT_SIZE, (i + 1) * COEFFICIENT_SIZE),
			pi * COEFFICIENT_SIZE,
		);
	});
	return hkdf(sha3_256, permutedBytes, '', info, 32);
}

/**
 * 密钥用途枚举
 * 标识不同的密钥用途，以便从同一基础密钥派生多个不同用途的密钥
 */
export enum KeyPurpose {
	/**
	 * 用于加密随机性的密钥
	 */
	EncryptedRandomness,
	
	/**
	 * 用于数据加密机制(DEM)的密钥
	 */
	DEM,
}

/**
 * 根据用途从基础密钥派生特定功能的密钥
 * 使用HMAC-SHA3-256进行密钥派生
 *
 * @param purpose - 密钥用途
 * @param baseKey - 基础密钥材料
 * @returns 派生的特定用途密钥
 */
export function deriveKey(purpose: KeyPurpose, baseKey: Uint8Array): Uint8Array {
	switch (purpose) {
		case KeyPurpose.EncryptedRandomness:
			return hmac(sha3_256, baseKey, new Uint8Array([0]));
		case KeyPurpose.DEM:
			return hmac(sha3_256, baseKey, new Uint8Array([1]));
	}
}
