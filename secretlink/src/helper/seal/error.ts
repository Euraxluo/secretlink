// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * 错误处理模块
 * 定义了SEAL库中使用的各种错误类型
 */

/**
 * SEAL库的基础错误类
 * 所有其他错误类型都继承自这个类
 */
export class SealError extends Error {}

/**
 * 用户输入错误类
 * 表示由用户输入引起的错误
 */
export class UserError extends SealError {}

/**
 * SEAL服务器API返回的错误基类
 * 包含请求ID和HTTP状态码等信息
 */
export class SealAPIError extends SealError {
	constructor(
		message: string,
		public requestId?: string,
		public status?: number,
	) {
		super(message);
	}

	/**
	 * 根据错误消息生成具体的错误类型实例
	 * @param message - 错误消息
	 * @param requestId - 请求ID
	 * @param status - HTTP状态码
	 * @returns 具体的错误类型实例
	 */
	static #generate(message: string, requestId: string, status?: number) {
		switch (message) {
			case 'InvalidPTB':
				return new InvalidPTBError(requestId);
			case 'InvalidPackage':
				return new InvalidPackageError(requestId);
			case 'NoAccess':
				return new NoAccessError(requestId);
			case 'InvalidCertificate':
				return new ExpiredSessionKeyError(requestId);
			case 'OldPackageVersion':
				return new OldPackageError(requestId);
			case 'InvalidSignature':
				return new InvalidUserSignatureError(requestId);
			case 'InvalidSessionSignature':
				return new InvalidSessionKeySignatureError(requestId);
			case 'Failure':
				return new InternalError(requestId);
			default:
				return new GeneralError(message, requestId, status);
		}
	}

	/**
	 * 检查HTTP响应，如果不成功则抛出相应的错误
	 * @param response - HTTP响应对象
	 * @param requestId - 请求ID
	 * @throws 如果响应不成功，抛出具体的API错误
	 */
	static async assertResponse(response: Response, requestId: string) {
		if (response.ok) {
			return;
		}
		let errorInstance: SealAPIError;
		try {
			const text = await response.text();
			const error = JSON.parse(text)['error'];
			errorInstance = SealAPIError.#generate(error, requestId);
		} catch (e) {
			// 如果无法将响应解析为JSON或格式不符合预期
			// 则使用状态文本作为错误信息
			errorInstance = new GeneralError(response.statusText, requestId, response.status);
		}
		throw errorInstance;
	}
}

// SEAL服务器返回的表示PTB(可能是预编译交易块)无效的错误

/**
 * PTB格式错误
 * 当PTB不符合预期格式时返回
 */
export class InvalidPTBError extends SealAPIError {
	constructor(requestId?: string) {
		super('PTB不符合预期格式', requestId);
	}
}

/**
 * 包ID错误
 * 当PTB中使用的包ID无效时返回
 */
export class InvalidPackageError extends SealAPIError {
	constructor(requestId?: string) {
		super('PTB中使用的包ID无效', requestId);
	}
}

/**
 * 旧包版本错误
 * 当PTB必须调用最新版本的包时返回
 */
export class OldPackageError extends SealAPIError {
	constructor(requestId?: string) {
		super('PTB必须调用包的最新版本', requestId);
	}
}

// SEAL服务器返回的表示用户签名无效的错误

/**
 * 用户签名错误
 * 当用户对会话密钥的签名无效时返回
 */
export class InvalidUserSignatureError extends SealAPIError {
	constructor(requestId?: string) {
		super('用户对会话密钥的签名无效', requestId);
	}
}

/**
 * 会话密钥签名错误
 * 当会话密钥的签名无效时返回
 */
export class InvalidSessionKeySignatureError extends SealAPIError {
	constructor(requestId?: string) {
		super('会话密钥签名无效', requestId);
	}
}

/**
 * 访问权限错误
 * 表示用户没有访问一个或多个请求密钥的权限
 */
export class NoAccessError extends SealAPIError {
	constructor(requestId?: string) {
		super('用户没有访问一个或多个请求密钥的权限', requestId);
	}
}

/**
 * 会话密钥过期错误
 * 表示所使用的会话密钥已过期
 */
export class ExpiredSessionKeyError extends SealAPIError {
	constructor(requestId?: string) {
		super('会话密钥已过期', requestId);
	}
}

/**
 * 内部服务器错误
 * 表示服务器内部错误，调用者应重试
 */
export class InternalError extends SealAPIError {
	constructor(requestId?: string) {
		super('服务器内部错误，调用者应重试', requestId);
	}
}

/**
 * 通用服务器错误
 * 表示不特定于SEAL API的通用服务器错误（如404"未找到"）
 */
export class GeneralError extends SealAPIError {}

// SDK返回的错误

/**
 * 个人消息签名无效错误
 * 当个人消息的签名验证失败时抛出
 */
export class InvalidPersonalMessageSignatureError extends UserError {}

/**
 * 获取对象错误
 * 当获取对象操作失败时抛出
 */
export class InvalidGetObjectError extends UserError {}

/**
 * 不支持的功能错误
 * 当尝试使用不支持的功能时抛出
 */
export class UnsupportedFeatureError extends UserError {}

/**
 * 不支持的网络错误
 * 当尝试在不支持的网络上操作时抛出
 */
export class UnsupportedNetworkError extends UserError {}

/**
 * 无效的密钥服务器错误
 * 当密钥服务器无效或无法连接时抛出
 */
export class InvalidKeyServerError extends UserError {}

/**
 * 无效的密文错误
 * 当密文格式无效或已损坏时抛出
 */
export class InvalidCiphertextError extends UserError {}

/**
 * 无效的阈值错误
 * 当指定的阈值无效或超出范围时抛出
 */
export class InvalidThresholdError extends UserError {}

/**
 * 密钥服务器不一致错误
 * 当客户端和加密对象的密钥服务器不一致时抛出
 */
export class InconsistentKeyServersError extends UserError {}

/**
 * 转换为多数错误
 * 从多个错误中选择出现次数最多的一个作为代表
 * 
 * @param errors - 错误数组
 * @returns 出现次数最多的错误
 */
export function toMajorityError(errors: Error[]): Error {
	let maxCount = 0;
	let majorityError = errors[0];
	const counts = new Map<string, number>();
	for (const error of errors) {
		const errorName = error.constructor.name;
		const newCount = (counts.get(errorName) || 0) + 1;
		counts.set(errorName, newCount);

		if (newCount > maxCount) {
			maxCount = newCount;
			majorityError = error;
		}
	}

	return majorityError;
}
