import { describe, it, expect } from 'vitest';
import { encodeCompositeKey, decodeCompositeKey } from '../../src/helper/encoding';
import { toBase58, fromBase58 } from '../../src/helper/base58';
import { ID_LENGTH, ENCRYPTION_KEY_LENGTH } from '../../src/config/constants';

describe('编码模块测试', () => {
  describe('Base58 编码测试', () => {
    it('应该能够正确编码和解码 Uint8Array', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const encoded = toBase58(original);
      
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
      
      const decoded = fromBase58(encoded);
      expect(decoded).toBeInstanceOf(Uint8Array);
      expect(Array.from(decoded)).toEqual(Array.from(original));
    });
    
    it('应该能够处理空数组', () => {
      const original = new Uint8Array([]);
      const encoded = toBase58(original);
      
      expect(typeof encoded).toBe('string');
      
      const decoded = fromBase58(encoded);
      expect(decoded).toBeInstanceOf(Uint8Array);
      expect(decoded.length).toBe(0);
    });
    
    it('应该能够处理大型数组', () => {
      const original = new Uint8Array(1000);
      for (let i = 0; i < original.length; i++) {
        original[i] = i % 256;
      }
      
      const encoded = toBase58(original);
      expect(typeof encoded).toBe('string');
      
      const decoded = fromBase58(encoded);
      expect(decoded).toBeInstanceOf(Uint8Array);
      expect(Array.from(decoded)).toEqual(Array.from(original));
    });
  });
  
  describe('复合密钥编码测试', () => {
    it('应该能够正确编码和解码复合密钥', () => {
      // 创建测试数据
      const version = 2;
      const id = toBase58(new Uint8Array(ID_LENGTH).fill(1)); // 模拟ID
      const encryptionKey = new Uint8Array(ENCRYPTION_KEY_LENGTH).fill(2); // 模拟加密密钥
      
      // 编码复合密钥
      const compositeKey = encodeCompositeKey(version, id, encryptionKey);
      
      expect(typeof compositeKey).toBe('string');
      expect(compositeKey.length).toBeGreaterThan(0);
      
      // 解码复合密钥
      const decoded = decodeCompositeKey(compositeKey);
      
      // 验证解码结果
      expect(decoded.version).toBe(version);
      expect(decoded.id).toBe(id);
      expect(Array.from(decoded.encryptionKey)).toEqual(Array.from(encryptionKey));
    });
    
    it('应该处理版本溢出错误', () => {
      const version = 256; // 超出单字节范围
      const id = toBase58(new Uint8Array(ID_LENGTH).fill(1));
      const encryptionKey = new Uint8Array(ENCRYPTION_KEY_LENGTH).fill(2);
      
      expect(() => encodeCompositeKey(version, id, encryptionKey)).toThrow('Version must fit in a byte');
    });
    
    it('应该处理负版本号错误', () => {
      const version = -1; // 负版本号
      const id = toBase58(new Uint8Array(ID_LENGTH).fill(1));
      const encryptionKey = new Uint8Array(ENCRYPTION_KEY_LENGTH).fill(2);
      
      expect(() => encodeCompositeKey(version, id, encryptionKey)).toThrow('Version must fit in a byte');
    });
    
    it('应该处理不支持的版本错误', () => {
      // 创建一个包含不支持版本的复合密钥
      const unsupportedVersion = 3; // 假设3是不支持的版本
      const id = toBase58(new Uint8Array(ID_LENGTH).fill(1));
      const encryptionKey = new Uint8Array(ENCRYPTION_KEY_LENGTH).fill(2);
      
      // 手动创建包含不支持版本的复合密钥
      const compositeKey = new Uint8Array([unsupportedVersion, ...fromBase58(id), ...encryptionKey]);
      const encodedKey = toBase58(compositeKey);
      
      expect(() => decodeCompositeKey(encodedKey)).toThrow('Unsupported composite key version');
    });
  });
}); 