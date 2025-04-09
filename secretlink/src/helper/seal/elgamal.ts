// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * ElGamal加密模块
 * 提供基于椭圆曲线的ElGamal加密系统实现
 * 用于密钥交换和加密通信
 */

import { G1Element, G2Element, Scalar } from './bls12381.js';

/**
 * 使用给定的私钥解密密文
 * 私钥必须是32字节的标量
 * 密文是一对G1元素(各48字节)
 * 
 * @param sk - 解密私钥
 * @param ciphertext - 密文对，包含两个字节数组
 * @returns 解密后的明文
 */
export function elgamalDecrypt(sk: Uint8Array, ciphertext: [Uint8Array, Uint8Array]): Uint8Array {
	return decrypt(Scalar.fromBytes(sk), [
		G1Element.fromBytes(ciphertext[0]),
		G1Element.fromBytes(ciphertext[1]),
	]).toBytes();
}

/**
 * 使用给定的私钥标量解密密文
 * 实现椭圆曲线ElGamal解密操作
 * 
 * @param sk - 私钥标量
 * @param encryption - 密文对，包含两个G1元素
 * @returns 解密后的G1元素
 */
function decrypt(sk: Scalar, encryption: [G1Element, G1Element]): G1Element {
	return encryption[1].subtract(encryption[0].multiply(sk));
}

/**
 * 生成随机私钥
 * 生成用于ElGamal加密系统的随机标量
 * 
 * @returns 生成的随机私钥字节数组
 */
export function generateSecretKey(): Uint8Array {
	return Scalar.random().toBytes();
}

/**
 * 从私钥导出BLS公钥
 * 使用G1曲线上的基点和私钥计算公钥
 * 
 * @param sk - 私钥字节数组
 * @returns 对应的公钥字节数组
 */
export function toPublicKey(sk: Uint8Array): Uint8Array {
	return G1Element.generator().multiply(Scalar.fromBytes(sk)).toBytes();
}

/**
 * 从私钥导出BLS验证密钥
 * 使用G2曲线上的基点和私钥计算验证密钥
 * 
 * @param sk - 私钥字节数组
 * @returns 对应的验证密钥字节数组
 */
export function toVerificationKey(sk: Uint8Array): Uint8Array {
	return G2Element.generator().multiply(Scalar.fromBytes(sk)).toBytes();
}
