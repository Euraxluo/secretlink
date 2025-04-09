// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toHex } from '@mysten/bcs';
import type { Fp2, Fp12 } from '@noble/curves/abstract/tower';
import type { ProjPointType } from '@noble/curves/abstract/weierstrass';
import { bls12_381 } from '@noble/curves/bls12-381';

/**
 * BLS12-381曲线上的G1群元素
 * 用于实现基于配对的加密方案
 */
export class G1Element {
	point: ProjPointType<bigint>;

	constructor(point: ProjPointType<bigint>) {
		this.point = point;
	}

	/**
	 * 获取G1群的生成元
	 * @returns G1群的生成元
	 */
	static generator(): G1Element {
		return new G1Element(bls12_381.G1.ProjectivePoint.BASE);
	}

	/**
	 * 从字节数组创建G1元素
	 * @param bytes - G1元素的字节表示
	 * @returns 新的G1元素
	 */
	static fromBytes(bytes: Uint8Array): G1Element {
		return new G1Element(bls12_381.G1.ProjectivePoint.fromHex(toHex(bytes)));
	}

	/**
	 * 将G1元素转换为字节数组
	 * @returns G1元素的字节表示
	 */
	toBytes(): Uint8Array {
		return this.point.toRawBytes();
	}

	/**
	 * 标量乘法运算
	 * @param scalar - 标量值
	 * @returns 乘法结果
	 */
	multiply(scalar: Scalar): G1Element {
		return new G1Element(this.point.multiply(scalar.scalar));
	}

	/**
	 * G1群上的加法运算
	 * @param other - 另一个G1元素
	 * @returns 加法结果
	 */
	add(other: G1Element): G1Element {
		return new G1Element(this.point.add(other.point));
	}

	/**
	 * G1群上的减法运算
	 * @param other - 另一个G1元素
	 * @returns 减法结果
	 */
	subtract(other: G1Element): G1Element {
		return new G1Element(this.point.subtract(other.point));
	}

	/**
	 * 将消息哈希到G1群上
	 * @param data - 输入消息
	 * @returns 哈希结果(G1元素)
	 */
	static hashToCurve(data: Uint8Array): G1Element {
		return new G1Element(
			bls12_381.G1.ProjectivePoint.fromAffine(bls12_381.G1.hashToCurve(data).toAffine()),
		);
	}

	/**
	 * 计算配对
	 * @param other - G2群元素
	 * @returns 配对结果(GT群元素)
	 */
	pairing(other: G2Element): GTElement {
		return new GTElement(bls12_381.pairing(this.point, other.point));
	}
}

/**
 * BLS12-381曲线上的G2群元素
 */
export class G2Element {
	point: ProjPointType<Fp2>;

	constructor(point: ProjPointType<Fp2>) {
		this.point = point;
	}

	/**
	 * 获取G2群的生成元
	 * @returns G2群的生成元
	 */
	static generator(): G2Element {
		return new G2Element(bls12_381.G2.ProjectivePoint.BASE);
	}

	/**
	 * 从字节数组创建G2元素
	 * @param bytes - G2元素的字节表示
	 * @returns 新的G2元素
	 */
	static fromBytes(bytes: Uint8Array): G2Element {
		return new G2Element(bls12_381.G2.ProjectivePoint.fromHex(toHex(bytes)));
	}

	/**
	 * 将G2元素转换为字节数组
	 * @returns G2元素的字节表示
	 */
	toBytes(): Uint8Array {
		return this.point.toRawBytes();
	}

	/**
	 * 标量乘法运算
	 * @param scalar - 标量值
	 * @returns 乘法结果
	 */
	multiply(scalar: Scalar): G2Element {
		return new G2Element(this.point.multiply(scalar.scalar));
	}

	/**
	 * G2群上的加法运算
	 * @param other - 另一个G2元素
	 * @returns 加法结果
	 */
	add(other: G2Element): G2Element {
		return new G2Element(this.point.add(other.point));
	}

	/**
	 * 将消息哈希到G2群上
	 * @param data - 输入消息
	 * @returns 哈希结果(G2元素)
	 */
	hashToCurve(data: Uint8Array): G2Element {
		return new G2Element(
			bls12_381.G2.ProjectivePoint.fromAffine(bls12_381.G2.hashToCurve(data).toAffine()),
		);
	}
}

/**
 * BLS12-381曲线上的GT群(目标群)元素
 * GT群是配对结果所在的群
 */
export class GTElement {
	element: Fp12;

	constructor(element: Fp12) {
		this.element = element;
	}

	/**
	 * 将GT元素转换为字节数组
	 * @returns GT元素的字节表示
	 */
	toBytes(): Uint8Array {
		return bls12_381.fields.Fp12.toBytes(this.element);
	}
}

/**
 * BLS12-381曲线上的标量(Scalar)
 * 用于群元素的标量乘法运算
 */
export class Scalar {
	scalar: bigint;

	constructor(scalar: bigint) {
		this.scalar = scalar;
	}

	/**
	 * 生成随机标量
	 * @returns 随机标量
	 */
	static random(): Scalar {
		return Scalar.fromBytes(bls12_381.utils.randomPrivateKey());
	}

	/**
	 * 将标量转换为字节数组
	 * @returns 标量的字节表示
	 */
	toBytes(): Uint8Array {
		return new Uint8Array(bls12_381.fields.Fr.toBytes(this.scalar));
	}

	/**
	 * 从字节数组创建标量
	 * @param bytes - 标量的字节表示
	 * @returns 新的标量
	 */
	static fromBytes(bytes: Uint8Array): Scalar {
		return new Scalar(bls12_381.fields.Fr.fromBytes(bytes));
	}

	/**
	 * 从数字创建标量
	 * @param num - 输入数字
	 * @returns 新的标量
	 */
	static fromNumber(num: number): Scalar {
		return new Scalar(BigInt(num));
	}
}
