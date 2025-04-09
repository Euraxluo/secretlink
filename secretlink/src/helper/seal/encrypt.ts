// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * 加密模块
 * 提供加密函数和相关工具，用于对数据进行安全加密
 */

import { fromHex } from '@mysten/bcs';
import { isValidSuiObjectId } from '@mysten/sui/utils';
import { split as externalSplit } from 'shamir-secret-sharing';

import type { IBEEncryptions } from './bcs.js';
import { EncryptedObject } from './bcs.js';
import type { EncryptionInput } from './dem.js';
import { UserError } from './error.js';
import { BonehFranklinBLS12381Services, DST } from './ibe.js';
import { deriveKey, KeyPurpose } from './kdf.js';
import type { KeyServer } from './key-server.js';
import { createFullId } from './utils.js';

/**
 * 最大无符号8位整数值
 * 用于限制服务器数量和阈值
 */
export const MAX_U8 = 255;

/**
 * 根据完整ID和要使用的密钥服务器，返回身份下的加密消息和加密对象的BCS字节
 *
 * @param keyServers - 密钥服务器列表（可以多次使用同一服务器）
 * @param kemType - 使用的KEM(密钥封装机制)类型
 * @param packageId - 包ID
 * @param id - 身份ID
 * @param encryptionInput - 加密输入，应为EncryptionInput类型之一，如AesGcmEncryptionInput或Plain
 * @param threshold - TSS加密的阈值
 * @returns 包含所有元数据的加密对象的BCS字节和用于加密对象的256位对称密钥
 * 由于密钥可以用于解密，因此不应共享，但可以用于备份等场景
 */
export async function encrypt({
	keyServers,
	kemType,
	threshold,
	packageId,
	id,
	encryptionInput,
}: {
	keyServers: KeyServer[];
	kemType: KemType;
	threshold: number;
	packageId: string;
	id: string;
	encryptionInput: EncryptionInput;
}): Promise<{
	encryptedObject: Uint8Array;
	key: Uint8Array;
}> {
	// 检查输入参数有效性
	if (
		keyServers.length < threshold ||
		threshold === 0 ||
		keyServers.length > MAX_U8 ||
		threshold > MAX_U8 ||
		!isValidSuiObjectId(packageId)
	) {
		throw new UserError(
			`无效的密钥服务器或阈值 ${threshold}，服务器数量为 ${keyServers.length}，包 ID 为 ${packageId}`,
		);
	}

	// 生成随机对称密钥并使用该密钥加密加密输入
	const key = await encryptionInput.generateKey();
	const demKey = deriveKey(KeyPurpose.DEM, key);
	const ciphertext = await encryptionInput.encrypt(demKey);

	// 将对称密钥分割成份额，并使用密钥服务器的公钥加密每个份额
	const shares = await split(key, keyServers.length, threshold);

	// 使用密钥服务器的公钥加密份额
	const fullId = createFullId(DST, packageId, id);
	const encryptedShares = encryptBatched(
		keyServers,
		kemType,
		fromHex(fullId),
		shares.map(({ share, index }) => ({
			msg: share,
			info: new Uint8Array([index]),
		})),
		deriveKey(KeyPurpose.EncryptedRandomness, key),
	);

	// 服务器及其份额索引存储为元组
	const services: [string, number][] = keyServers.map((server, i) => [
		server.objectId,
		shares[i].index,
	]);

	return {
		encryptedObject: EncryptedObject.serialize({
			version: 0,
			packageId,
			id,
			services,
			threshold,
			encryptedShares,
			ciphertext,
		}).toBytes(),
		key: demKey,
	};
}

/**
 * 密钥封装机制(KEM)类型枚举
 * 目前仅支持BLS12-381曲线上的Boneh-Franklin方案
 */
export enum KemType {
	/**
	 * 基于BLS12-381曲线的Boneh-Franklin密钥封装机制，带CCA安全性
	 */
	BonehFranklinBLS12381DemCCA = 0,
}

/**
 * 数据封装机制(DEM)类型枚举
 * 支持AES-GCM和HMAC-CTR两种加密模式
 */
export enum DemType {
	/**
	 * AES-GCM 256位加密模式
	 */
	AesGcm256 = 0,
	/**
	 * HMAC-SHA256-CTR加密模式
	 */
	Hmac256Ctr = 1,
}

/**
 * 批量加密共享密钥
 * 
 * @param keyServers - 密钥服务器列表
 * @param kemType - KEM类型
 * @param id - 身份ID
 * @param shares - 要加密的份额列表，每个包含消息和信息
 * @param randomnessKey - 随机性密钥
 * @returns 加密后的IBE份额
 */
function encryptBatched(
	keyServers: KeyServer[],
	kemType: KemType,
	id: Uint8Array,
	shares: { msg: Uint8Array; info: Uint8Array }[],
	randomnessKey: Uint8Array,
): typeof IBEEncryptions.$inferType {
	switch (kemType) {
		case KemType.BonehFranklinBLS12381DemCCA:
			return new BonehFranklinBLS12381Services(keyServers).encryptBatched(
				id,
				shares,
				randomnessKey,
			);
	}
}

/**
 * 将秘密分割成多个份额
 * 使用Shamir秘密共享方案
 * 
 * @param secret - 要分割的秘密
 * @param n - 份额总数
 * @param threshold - 重建秘密所需的最小份额数
 * @returns 分割后的份额数组，每个包含索引和份额数据
 */
async function split(
	secret: Uint8Array,
	n: number,
	threshold: number,
): Promise<{ index: number; share: Uint8Array }[]> {
	// externalSplit函数来自'shamir-secret-sharing'包，要求t > 1且n >= 2
	// 这里处理特殊情况
	if (n === 0 || threshold === 0 || threshold > n) {
		throw new Error('无效的阈值或份额数量');
	} else if (threshold === 1) {
		// 如果阈值为1，则不分割秘密
		const result = [];
		for (let i = 0; i < n; i++) {
			// 在这种情况下，共享多项式是常数，因此索引无关紧要
			// 为确保它们是唯一的，我们使用计数器
			result.push({ share: secret, index: i });
		}
		return Promise.resolve(result);
	}

	return externalSplit(secret, n, threshold).then((share) =>
		share.map((s) => ({
			share: s.subarray(0, s.length - 1),
			// split()函数在最后一个字节返回份额索引
			index: s[s.length - 1],
		})),
	);
}
