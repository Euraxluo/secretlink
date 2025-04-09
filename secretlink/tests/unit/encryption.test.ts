import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  encryptSecureContent,
  encryptAndPrepareForUpload,
  decryptUploadedContent,
  encryptDemo,
  decryptDemo
} from '../../src/helper/encryption';
import { SecureContent } from '../../src/components/ContextViewer';
import { Version } from '../../src/config/constants';
import { toBase58 } from '../../src/helper/base58';

describe('传统加密模块测试', () => {
  // 基础加密函数测试
  describe('基本加密函数测试', () => {
    it('encryptDemo 应该正确加密文本', async () => {
      const text = '测试加密文本';
      const result = await encryptDemo(text);
      
      expect(result.encrypted).toBeInstanceOf(Uint8Array);
      expect(result.iv).toBeInstanceOf(Uint8Array);
      expect(result.key).toBeInstanceOf(Uint8Array);
      
      expect(result.encrypted.length).toBeGreaterThan(0);
      expect(result.iv.length).toBe(16);
      expect(result.key.length).toBe(16); // AES-128
    });
    
    it('encryptSecureContent 应该正确加密文本内容', async () => {
      const content: SecureContent = {
        type: 'text',
        content: '这是测试文本内容',
        timestamp: Date.now()
      };
      
      const result = await encryptSecureContent(content);
      
      expect(result.encrypted).toBeInstanceOf(Uint8Array);
      expect(result.iv).toBeInstanceOf(Uint8Array);
      expect(result.key).toBeInstanceOf(Uint8Array);
      
      expect(result.encrypted.length).toBeGreaterThan(0);
      expect(result.iv.length).toBe(16);
      expect(result.key.length).toBe(16);
    });
    
    it('encryptSecureContent 应该正确加密文件内容', async () => {
      const fileContent = new Blob(['测试文件内容'], { type: 'text/plain' });
      const content: SecureContent = {
        type: 'file',
        content: fileContent,
        fileType: 'text/plain',
        fileName: 'test.txt',
        timestamp: Date.now()
      };
      
      const result = await encryptSecureContent(content);
      
      expect(result.encrypted).toBeInstanceOf(Uint8Array);
      expect(result.iv).toBeInstanceOf(Uint8Array);
      expect(result.key).toBeInstanceOf(Uint8Array);
      
      expect(result.encrypted.length).toBeGreaterThan(0);
    });
  });
  
  // 完整加密解密流程测试
  describe('完整加密解密流程测试', () => {
    let textContent: SecureContent;
    let fileContent: SecureContent;
    
    beforeEach(() => {
      const now = Date.now();
      
      textContent = {
        type: 'text',
        content: '这是测试文本内容，用于验证完整加密解密流程',
        timestamp: now
      };
      
      const blob = new Blob(['这是测试文件内容，用于验证完整加密解密流程'], { type: 'text/plain' });
      fileContent = {
        type: 'file',
        content: blob,
        fileType: 'text/plain',
        fileName: 'test.txt',
        timestamp: now
      };
    });
    
    it('应该能够加密和解密文本内容', async () => {
      // 进度回调模拟
      const progressSpy = vi.fn();
      
      // 加密内容
      const { blob, key } = await encryptAndPrepareForUpload(textContent, progressSpy);
      
      // 验证回调至少被调用一次
      expect(progressSpy).toHaveBeenCalled();
      
      // 验证生成了有效的blob
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
      
      // 解密内容
      const decryptProgressSpy = vi.fn();
      const decrypted = await decryptUploadedContent(blob, key, decryptProgressSpy);
      
      // 验证回调被调用
      expect(decryptProgressSpy).toHaveBeenCalled();
      
      // 验证解密后的内容
      expect(decrypted.type).toBe('text');
      expect(decrypted.content).toBe(textContent.content);
      expect(decrypted.timestamp).toBe(textContent.timestamp);
    });
    
    it('应该能够加密和解密文件内容', async () => {
      // 加密内容
      const { blob, key } = await encryptAndPrepareForUpload(fileContent);
      
      // 解密内容
      const decrypted = await decryptUploadedContent(blob, key);
      
      // 验证解密后的内容
      expect(decrypted.type).toBe('file');
      expect(decrypted.fileType).toBe(fileContent.fileType);
      expect(decrypted.fileName).toBe(fileContent.fileName);
      expect(decrypted.timestamp).toBe(fileContent.timestamp);
      
      // 验证文件内容
      const originalContent = await (fileContent.content as Blob).text();
      const decryptedContent = await (decrypted.content as Blob).text();
      expect(decryptedContent).toBe(originalContent);
    });
    
    it('应该能处理不同大小的数据', async () => {
      // 测试不同大小的数据
      const sizes = [10, 100, 1000];
      
      for (const size of sizes) {
        // 创建指定大小的随机数据
        const randomData = new Uint8Array(size);
        crypto.getRandomValues(randomData);
        
        const content: SecureContent = {
          type: 'file',
          content: new Blob([randomData]),
          fileType: 'application/octet-stream',
          fileName: `random_${size}.bin`,
          timestamp: Date.now()
        };
        
        // 加密
        const { blob, key } = await encryptAndPrepareForUpload(content);
        
        // 解密
        const decrypted = await decryptUploadedContent(blob, key);
        
        // 验证解密结果
        expect(decrypted.type).toBe('file');
        expect(decrypted.fileName).toBe(content.fileName);
        
        // 验证内容匹配
        const decryptedBuffer = await (decrypted.content as Blob).arrayBuffer();
        const decryptedArray = new Uint8Array(decryptedBuffer);
        expect(Array.from(decryptedArray)).toEqual(Array.from(randomData));
      }
    });
  });
  
  // 错误处理测试
  describe('错误处理测试', () => {
    it('应该处理无效的内容类型', async () => {
      // 使用无效的格式，但保持类型为有效的
      const invalidContent: SecureContent = {
        type: 'text',
        // @ts-ignore - 故意使内容格式无效（缺少内容）
        content: undefined,
        timestamp: Date.now()
      };
      
      await expect(encryptSecureContent(invalidContent)).rejects.toThrow();
    });
    
    it('应该处理版本不匹配错误', async () => {
      const content: SecureContent = {
        type: 'text',
        content: '测试内容',
        timestamp: Date.now()
      };
      
      // 加密内容
      const { blob, key } = await encryptAndPrepareForUpload(content);
      
      // 修改版本号
      const arrayBuffer = await blob.arrayBuffer();
      const modifiedBuffer = new Uint8Array(arrayBuffer);
      modifiedBuffer[0] = 255; // 设置一个不支持的版本号
      
      const modifiedBlob = new Blob([modifiedBuffer], { type: blob.type });
      
      // 解密应该失败
      await expect(decryptUploadedContent(modifiedBlob, key)).rejects.toThrow('Unsupported version');
    });
  });
}); 