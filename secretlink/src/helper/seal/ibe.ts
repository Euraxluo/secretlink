// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * 基于身份的加密(IBE)模块
 * 实现Boneh-Franklin基于身份的加密方案
 * 允许使用用户身份作为公钥进行加密
 */

import { fromHex } from '@mysten/bcs';

import type { IBEEncryptions } from './bcs.js';
import type { GTElement } from './bls12381.js';
import { G1Element, G2Element, Scalar } from './bls12381.js';
import { kdf } from './kdf.js';
import type { KeyServer } from './key-server.js';
import { xor } from './utils.js';

/**
 * 哈希到群函数的域分隔标签
 * 用于防止不同协议上下文中的哈希碰撞
 */
export const DST: Uint8Array = new TextEncoder().encode('SUI-SEAL-IBE-BLS12381-00');

/**
 * 签名持有证明的域分隔标签
 * 用于证明私钥持有者的身份
 */
export const DST_POP: Uint8Array = new TextEncoder().encode('SUI-SEAL-IBE-BLS12381-POP-00');

/**
 * 密钥服务器的抽象接口
 * 定义了IBE系统中密钥服务器的基本功能
 */
export abstract class IBEServers {
	/**
	 * 密钥服务器对象ID列表
	 */
	objectIds: string[];

	/**
	 * 创建IBE服务器实例
	 * @param objectIds - 密钥服务器对象ID列表
	 */
	constructor(objectIds: string[]) {
		this.objectIds = objectIds;
	}

	/**
	 * 获取密钥服务器的数量
	 * @returns 密钥服务器的数量
	 */
	size(): number {
		return this.objectIds.length;
	}

	/**
	 * 对给定身份批量加密消息
	 * 抽象方法，需要由子类实现
	 *
	 * @param id - 用户身份
	 * @param msgAndInfos - 消息和附加信息参数数组，附加信息将包含在KDF中
	 * @param randomnessKey - 随机性密钥
	 * @returns 加密后的消息
	 */
	abstract encryptBatched(
		id: Uint8Array,
		msgAndInfos: { msg: Uint8Array; info: Uint8Array }[],
		randomnessKey: Uint8Array,
	): typeof IBEEncryptions.$inferType;
}

/**
 * 基于Boneh-Franklin方案的身份加密实现
 * 该对象表示一组可用于为给定身份加密消息的密钥服务器
 * 实现基于BLS12-381曲线的IBE方案
 */
export class BonehFranklinBLS12381Services extends IBEServers {
	/**
	 * 服务器公钥列表
	 */
	readonly publicKeys: G2Element[];

	/**
	 * 创建Boneh-Franklin IBE服务实例
	 * @param services - 密钥服务器列表
	 */
	constructor(services: KeyServer[]) {
		super(services.map((service) => service.objectId));
		this.publicKeys = services.map((service) => G2Element.fromBytes(service.pk));
	}

	/**
	 * 批量加密消息
	 * 为给定身份使用不同的密钥服务器加密多条消息
	 *
	 * @param id - 用户身份
	 * @param msgAndInfos - 消息和附加信息参数数组
	 * @param randomnessKey - 随机性密钥
	 * @returns 加密后的IBE对象
	 * @throws 如果公钥无效或公钥数量与消息数量不匹配
	 */
	encryptBatched(
		id: Uint8Array,
		msgAndInfos: { msg: Uint8Array; info: Uint8Array }[],
		randomnessKey: Uint8Array,
	): typeof IBEEncryptions.$inferType {
		if (this.publicKeys.length === 0 || this.publicKeys.length !== msgAndInfos.length) {
			throw new Error('无效的公钥');
		}
		const [r, nonce, keys] = encapBatched(this.publicKeys, id);
		const encryptedShares = msgAndInfos.map((msgAndInfo, i) =>
			xor(msgAndInfo.msg, kdf(keys[i], msgAndInfo.info)),
		);
		const encryptedRandomness = xor(randomnessKey, r.toBytes());

		return {
			BonehFranklinBLS12381: {
				nonce: nonce.toBytes(),
				encryptedShares,
				encryptedRandomness,
			},
			$kind: 'BonehFranklinBLS12381',
		};
	}

	/**
	 * 验证用户密钥是否对给定公钥和ID有效
	 * 通过配对关系验证密钥有效性
	 * 
	 * @param userSecretKey - 用户私钥
	 * @param id - 用户身份标识符
	 * @param publicKey - 服务器公钥
	 * @returns 如果用户密钥对给定公钥和ID有效，则返回true
	 */
	static verifyUserSecretKey(userSecretKey: G1Element, id: string, publicKey: G2Element): boolean {
		const lhs = userSecretKey.pairing(G2Element.generator()).toBytes();
		const rhs = G1Element.hashToCurve(fromHex(id)).pairing(publicKey).toBytes();
		return lhs.length === rhs.length && lhs.every((value, index) => value === rhs[index]);
	}

	/**
	 * 基于身份的解密
	 * 使用用户私钥解密密文
	 *
	 * @param nonce - 加密随机数
	 * @param sk - 用户私钥
	 * @param ciphertext - 加密消息
	 * @param info - 附加信息参数，也包含在KDF中
	 * @returns 解密后的消息
	 */
	static decrypt(
		nonce: G2Element,
		sk: G1Element,
		ciphertext: Uint8Array,
		info: Uint8Array,
	): Uint8Array {
		return xor(ciphertext, kdf(decap(nonce, sk), info));
	}
}

/**
 * 批量基于身份的密钥封装机制
 * 使用不同的密钥服务器为给定身份封装多个密钥
 *
 * @param publicKeys - 一组密钥服务器的公钥
 * @param id - 用于封装密钥的身份
 * @returns 密钥的公共随机数和密钥列表，每个32字节
 * @throws 如果未提供公钥
 */
function encapBatched(publicKeys: G2Element[], id: Uint8Array): [Scalar, G2Element, GTElement[]] {
	if (publicKeys.length === 0) {
		throw new Error('未提供公钥');
	}
	const r = Scalar.random();
	const nonce = G2Element.generator().multiply(r);
	const gid = G1Element.hashToCurve(id).multiply(r);
	return [r, nonce, publicKeys.map((public_key) => gid.pairing(public_key))];
}

/**
 * 使用用户私钥和随机数解封密钥
 *
 * @param nonce - 随机数
 * @param usk - 用户私钥
 * @returns 解封的密钥
 */
function decap(nonce: G2Element, usk: G1Element): GTElement {
	return usk.pairing(nonce);
}
