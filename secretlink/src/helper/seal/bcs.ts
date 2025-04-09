// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromHex, toHex } from '@mysten/bcs';
import { bcs } from '@mysten/sui/bcs';

/**
 * IBE加密方案的枚举类型定义
 * 目前支持 BonehFranklinBLS12381 方案
 */
export const IBEEncryptions = bcs.enum('IBEEncryptions', {
	/**
	 * Boneh-Franklin IBE方案,使用BLS12-381曲线
	 * @property nonce - 96字节的随机数
	 * @property encryptedShares - 加密后的份额列表,每个份额32字节
	 * @property encryptedRandomness - 32字节的加密随机数
	 */
	BonehFranklinBLS12381: bcs.struct('BonehFranklinBLS12381', {
		nonce: bcs.bytes(96),
		encryptedShares: bcs.vector(bcs.bytes(32)),
		encryptedRandomness: bcs.bytes(32),
	}),
});

/**
 * 密文的枚举类型定义
 * 支持三种加密模式:AES-256-GCM、HMAC-SHA256-CTR和明文
 */
export const Ciphertext = bcs.enum('Ciphertext', {
	/**
	 * AES-256-GCM 加密模式
	 * @property blob - 加密后的数据
	 * @property aad - 可选的额外认证数据
	 */
	Aes256Gcm: bcs.struct('Aes256Gcm', {
		blob: bcs.vector(bcs.U8),
		aad: bcs.option(bcs.vector(bcs.U8)),
	}),
	/**
	 * HMAC-SHA256-CTR 加密模式
	 * @property blob - 加密后的数据
	 * @property aad - 可选的额外认证数据
	 * @property mac - 32字节的消息认证码
	 */
	Hmac256Ctr: bcs.struct('Hmac256Ctr', {
		blob: bcs.vector(bcs.U8),
		aad: bcs.option(bcs.vector(bcs.U8)),
		mac: bcs.bytes(32),
	}),
	/**
	 * 明文模式,不进行加密
	 */
	Plain: bcs.struct('Plain', {}),
});

/**
 * 加密对象的格式定义,需要与Rust实现保持一致
 * @property version - 版本号
 * @property packageId - 包ID
 * @property id - 对象ID
 * @property services - 密钥服务器列表,每个元素为[地址,索引]对
 * @property threshold - 门限值
 * @property encryptedShares - IBE加密的份额
 * @property ciphertext - 加密后的密文
 */
export const EncryptedObject = bcs.struct('EncryptedObject', {
	version: bcs.U8,
	packageId: bcs.Address,
	id: bcs.vector(bcs.U8).transform({
		output: (val) => toHex(new Uint8Array(val)),
		input: (val: string) => fromHex(val),
	}),
	services: bcs.vector(bcs.tuple([bcs.Address, bcs.U8])),
	threshold: bcs.U8,
	encryptedShares: IBEEncryptions,
	ciphertext: Ciphertext,
});

/**
 * KeyServer对象的Move结构定义
 * @property id - 服务器ID
 * @property name - 服务器名称
 * @property url - 服务器URL
 * @property keyType - 密钥类型
 * @property pk - 公钥
 */
export const KeyServerMove = bcs.struct('KeyServer', {
	id: bcs.Address,
	name: bcs.string(),
	url: bcs.string(),
	keyType: bcs.u8(),
	pk: bcs.vector(bcs.u8()),
});
