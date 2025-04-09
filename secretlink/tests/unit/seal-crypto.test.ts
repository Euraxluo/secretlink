import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  generateRandomKey, 
  generateNonce, 
  deriveEncryptionKey,
  encryptWithSeal,
  decryptWithSeal,
  encryptContentWithSeal,
  decryptContentWithSeal
} from '../../src/helper/seal-crypto';
import { SecureContent } from '../../src/components/ContextViewer';
import { Version } from '../../src/config/constants';

// 模拟 Blob 类
class MockBlob {
  private data: Uint8Array;
  public type: string;

  constructor(parts: Array<Uint8Array | string>, options?: { type?: string }) {
    if (parts.length === 1 && parts[0] instanceof Uint8Array) {
      this.data = parts[0];
    } else if (parts.length === 1 && typeof parts[0] === 'string') {
      this.data = new TextEncoder().encode(parts[0]);
    } else {
      throw new Error('不支持的 Blob 构造参数');
    }
    this.type = options?.type || '';
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return this.data.buffer;
  }

  async text(): Promise<string> {
    return new TextDecoder().decode(this.data);
  }
}

// 替换全局 Blob 类
global.Blob = MockBlob as any;

describe('Seal加密库测试', () => {
  describe('基础加密解密测试', () => {
    it('应该能够加密和解密数据', async () => {
      const key = new Uint8Array(32);
      crypto.getRandomValues(key);
      
      const data = new TextEncoder().encode('测试数据');
      const encrypted = await encryptWithSeal(key, data);
      expect(encrypted).toBeInstanceOf(Uint8Array);
      
      const decrypted = await decryptWithSeal(key, encrypted);
      expect(decrypted).toBeInstanceOf(Uint8Array);
      expect(new TextDecoder().decode(decrypted)).toBe('测试数据');
    });

    it('应该能够处理空数据', async () => {
      const key = new Uint8Array(32);
      crypto.getRandomValues(key);
      
      const data = new Uint8Array(0);
      const encrypted = await encryptWithSeal(key, data);
      expect(encrypted).toBeInstanceOf(Uint8Array);
      
      const decrypted = await decryptWithSeal(key, encrypted);
      expect(decrypted).toBeInstanceOf(Uint8Array);
      expect(decrypted.length).toBe(0);
    });

    it('应该能够处理大数据', async () => {
      const key = new Uint8Array(32);
      crypto.getRandomValues(key);
      
      const data = new Uint8Array(65536); // 64KB
      for (let i = 0; i < data.length; i++) {
        data[i] = i % 256;
      }
      
      const encrypted = await encryptWithSeal(key, data);
      expect(encrypted).toBeInstanceOf(Uint8Array);
      
      const decrypted = await decryptWithSeal(key, encrypted);
      expect(decrypted).toBeInstanceOf(Uint8Array);
      expect(Array.from(decrypted)).toEqual(Array.from(data));
    });
  });

  describe('Seal内容加密测试', () => {
    it('应该能够加密和解密文本内容', async () => {
      const content: SecureContent = {
        type: 'text',
        content: '测试文本内容',
        timestamp: Date.now()
      };

      const { encryptedData, shareId } = await encryptContentWithSeal(content);
      expect(encryptedData).toBeInstanceOf(Uint8Array);
      expect(shareId).toMatch(/^sl[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/);

      const decryptedContent = await decryptContentWithSeal(shareId, encryptedData);
      expect(decryptedContent.type).toBe('text');
      expect(typeof decryptedContent.content).toBe('string');
      expect(decryptedContent.content).toBe('测试文本内容');
      expect(decryptedContent.timestamp).toBe(content.timestamp);
    });

    it('应该能够加密和解密文件内容', async () => {
      const fileContent = new Uint8Array([1, 2, 3, 4, 5]);
      const blob = new MockBlob([fileContent], { type: 'application/octet-stream' });
      const content: SecureContent = {
        type: 'file',
        content: blob as unknown as Blob,
        fileName: 'test.bin',
        fileType: 'application/octet-stream',
        timestamp: Date.now()
      };

      const { encryptedData, shareId } = await encryptContentWithSeal(content);
      expect(encryptedData).toBeInstanceOf(Uint8Array);

      const decryptedContent = await decryptContentWithSeal(shareId, encryptedData);
      expect(decryptedContent.type).toBe('file');
      expect(decryptedContent.fileName).toBe('test.bin');
      expect(decryptedContent.fileType).toBe('application/octet-stream');
      expect(decryptedContent.content instanceof Uint8Array).toBe(true);
      
      const decryptedArray = decryptedContent.content as Uint8Array;
      expect(Array.from(decryptedArray)).toEqual([1, 2, 3, 4, 5]);
    });

    it('应该能够处理不同大小的数据', async () => {
      const sizes = [10, 100, 1000, 10000];
      for (const size of sizes) {
        const data = new Uint8Array(size);
        for (let i = 0; i < data.length; i++) {
          data[i] = i % 256;
        }
        
        const blob = new MockBlob([data], { type: 'application/octet-stream' });
        const content: SecureContent = {
          type: 'file',
          content: blob as unknown as Blob,
          fileName: `test_${size}.bin`,
          fileType: 'application/octet-stream',
          timestamp: Date.now()
        };

        const { encryptedData, shareId } = await encryptContentWithSeal(content);
        const decryptedContent = await decryptContentWithSeal(shareId, encryptedData);
        expect(decryptedContent.type).toBe('file');
        expect(decryptedContent.content instanceof Uint8Array).toBe(true);
        
        const decryptedArray = decryptedContent.content as Uint8Array;
        expect(Array.from(decryptedArray)).toEqual(Array.from(data));
      }
    });

    describe('错误处理测试', () => {
      it('应该处理无效的shareId格式', async () => {
        const { encryptedData } = await encryptContentWithSeal({
          type: 'text',
          content: '测试内容',
          timestamp: Date.now()
        });

        await expect(decryptContentWithSeal('invalid', encryptedData))
          .rejects.toThrow('无效的分享ID格式');
      });

      it('应该处理错误的解密密钥', async () => {
        const { encryptedData } = await encryptContentWithSeal({
          type: 'text',
          content: '测试内容',
          timestamp: Date.now()
        });

        await expect(decryptContentWithSeal('slABCDEFGHIJKLMNOPQRSTUVWXYZ', encryptedData))
          .rejects.toThrow('无效的分享ID格式');
      });

      it('应该处理损坏的加密数据', async () => {
        const { shareId } = await encryptContentWithSeal({
          type: 'text',
          content: '测试内容',
          timestamp: Date.now()
        });

        const corruptedData = new Uint8Array(10);
        for (let i = 0; i < corruptedData.length; i++) {
          corruptedData[i] = i % 256;
        }

        await expect(decryptContentWithSeal(shareId, corruptedData))
          .rejects.toThrow();
      });
    });
  });
}); 