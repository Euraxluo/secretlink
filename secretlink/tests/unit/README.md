# SecretLink 加密解密单元测试

本目录包含了 SecretLink 加密解密功能的单元测试，涵盖了关键流程和功能点。

## 测试文件结构

- **seal-crypto.test.ts**: 测试 Seal 优化版本的加密解密功能
- **encryption.test.ts**: 测试传统 AES-GCM 加密解密功能
- **encoding.test.ts**: 测试 Base58 编码和复合密钥编解码功能
- **integration.test.ts**: 集成测试完整加密解密流程
- **share-link.test.ts**: 测试分享链接的生成和解析功能

## 功能覆盖范围

### 基础密码学功能

- 密钥生成
- 随机数生成
- 密钥派生
- 数据加密和解密

### 编码功能

- Base58 编码和解码
- 复合密钥的编码和解码

### 内容处理

- 文本内容的加密和解密
- 文件内容的加密和解密
- 不同大小数据的处理能力

### 分享链接

- 传统格式分享链接的生成和解析
- Seal 优化格式分享链接的生成和解析
- URL 参数处理

### 错误处理

- 无效的内容类型
- 无效的版本号
- 损坏的加密数据
- 无效的分享链接格式

## 运行测试

使用以下命令运行所有测试：

```bash
npm run test
```

运行特定测试文件：

```bash
npm run test -- tests/unit/seal-crypto.test.ts
```

## 测试环境

测试使用 Vitest 框架，并在 jsdom 环境中运行。测试环境配置在 `vitest.config.js` 和 `tests/setup.js` 中设置。 