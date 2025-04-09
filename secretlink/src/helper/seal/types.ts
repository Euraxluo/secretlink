// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * 类型定义文件
 * 定义SEAL库中使用的各种类型和接口
 */

/**
 * 密钥缓存的键类型
 * 格式为 `${完整ID}:${服务器对象ID}`
 * 用于在密钥缓存中唯一标识一个密钥
 */
export type KeyCacheKey = `${string}:${string}`;
