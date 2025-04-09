// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * 工具函数模块
 * 提供SEAL库中使用的各种辅助函数
 */

import { fromHex, toHex } from '@mysten/bcs';
import { isValidSuiObjectId } from '@mysten/sui/utils';

import { UserError } from './error.js';

/**
 * 执行两个字节数组的异或操作
 * 安全版本，会检查两个数组长度是否相同
 * 
 * @param a - 第一个字节数组
 * @param b - 第二个字节数组
 * @returns 异或操作的结果
 * @throws 如果输入数组长度不同
 */
export function xor(a: Uint8Array, b: Uint8Array): Uint8Array {
	if (a.length !== b.length) {
		throw new Error('无效的输入');
	}
	return xorUnchecked(a, b);
}

/**
 * 执行两个字节数组的异或操作
 * 不安全版本，不检查数组长度
 * 如果b比a短，可能会导致未定义行为
 * 
 * @param a - 第一个字节数组
 * @param b - 第二个字节数组
 * @returns 异或操作的结果
 */
export function xorUnchecked(a: Uint8Array, b: Uint8Array): Uint8Array {
	return a.map((ai, i) => ai ^ b[i]);
}

/**
 * 创建完整ID，连接格式为 DST || 包ID || 内部ID
 * 用于在IBE系统中唯一标识加密对象
 * 
 * @param dst - 域分隔标签
 * @param packageId - 包ID
 * @param innerId - 内部ID
 * @returns 完整ID的十六进制字符串
 * @throws 如果包ID无效
 */
export function createFullId(dst: Uint8Array, packageId: string, innerId: string): string {
	if (!isValidSuiObjectId(packageId)) {
		throw new UserError(`无效的包ID ${packageId}`);
	}
	const packageIdBytes = fromHex(packageId);
	const innerIdBytes = fromHex(innerId);
	const fullId = new Uint8Array(1 + dst.length + packageIdBytes.length + innerIdBytes.length);
	fullId.set([dst.length], 0);
	fullId.set(dst, 1);
	fullId.set(packageIdBytes, 1 + dst.length);
	fullId.set(innerIdBytes, 1 + dst.length + packageIdBytes.length);
	return toHex(fullId);
}
