import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SecureContent } from '../../src/components/ContextViewer';
import { encryptAndPrepareForUpload } from '../../src/helper/encryption';
import { encryptContentWithSeal } from '../../src/helper/seal-crypto';
import { encodeCompositeKey, decodeCompositeKey } from '../../src/helper/encoding';
import { toBase58, fromBase58 } from '../../src/helper/base58';
import { LATEST_KEY_VERSION } from '../../src/config/constants';

// 模拟 WalrusClient
vi.mock('../../src/components/WalrusClient', () => {
  return {
    WalrusClient: class MockWalrusClient {
      store = vi.fn().mockImplementation(async (blob) => {
        return {
          newlyCreated: {
            blobObject: {
              blobId: 'mock-blob-id-' + Date.now()
            }
          }
        };
      });
      
      retrieve = vi.fn().mockImplementation(async (blobId, options) => {
        return new Blob(['mock data']);
      });
    }
  };
});

// 模拟 storeEncryptedData 和 extractEncryptedData
vi.mock('../../src/helper/id', () => {
  const storageMap = new Map();
  
  return {
    storeEncryptedData: vi.fn().mockImplementation((id) => {
      const idKey = 'mock-id-' + Date.now();
      storageMap.set(idKey, id);
      return new TextEncoder().encode(idKey);
    }),
    
    extractEncryptedData: vi.fn().mockImplementation((encodedId) => {
      const idKey = new TextDecoder().decode(encodedId);
      return storageMap.get(idKey) || 'mock-fallback-id';
    }),
  };
});

describe('分享链接测试', () => {
  let textContent: SecureContent;
  
  beforeEach(() => {
    textContent = {
      type: 'text',
      content: '这是一条测试信息，用于创建分享链接',
      timestamp: Date.now()
    };
  });
  
  describe('传统分享链接格式测试', () => {
    it('应该能正确创建和解析分享链接', async () => {
      // 1. 加密内容
      const { blob, key } = await encryptAndPrepareForUpload(textContent);
      
      // 2. 模拟存储ID
      const mockId = 'mock-walrus-blob-id';
      const storedId = toBase58(new TextEncoder().encode('stored-' + mockId));
      
      // 3. 创建分享链接
      const compositeKey = encodeCompositeKey(LATEST_KEY_VERSION, storedId, key);
      const shareLink = `https://example.com/${compositeKey}`;
      
      // 从分享链接中提取复合密钥
      const extractedCompositeKey = shareLink.substring('https://example.com/'.length);
      expect(extractedCompositeKey).toBe(compositeKey);
      
      // 解析复合密钥
      const { version, id, encryptionKey } = decodeCompositeKey(extractedCompositeKey);
      
      // 验证解析结果
      expect(version).toBe(LATEST_KEY_VERSION);
      expect(id).toBe(storedId);
      expect(Array.from(encryptionKey)).toEqual(Array.from(key));
    });
    
    it('应该能处理带有参数的链接', async () => {
      // 1. 模拟链接部分
      const mockId = 'mock-walrus-blob-id';
      const storedId = toBase58(new TextEncoder().encode('stored-' + mockId));
      const key = new Uint8Array(32);
      crypto.getRandomValues(key);
      
      // 2. 创建分享链接
      const compositeKey = encodeCompositeKey(LATEST_KEY_VERSION, storedId, key);
      const shareLink = `https://example.com/${compositeKey}?utm_source=test&ref=example`;
      
      // 从分享链接中提取复合密钥
      const url = new URL(shareLink);
      const extractedCompositeKey = url.pathname.substring(1); // 移除开头的 /
      
      expect(extractedCompositeKey).toBe(compositeKey);
      expect(url.searchParams.get('utm_source')).toBe('test');
      expect(url.searchParams.get('ref')).toBe('example');
      
      // 解析复合密钥
      const { version, id, encryptionKey } = decodeCompositeKey(extractedCompositeKey);
      
      // 验证解析结果
      expect(version).toBe(LATEST_KEY_VERSION);
      expect(id).toBe(storedId);
      expect(Array.from(encryptionKey)).toEqual(Array.from(key));
    });
  });
  
  describe('Seal优化分享链接格式测试', () => {
    it('应该能正确创建和解析Seal分享链接', async () => {
      // 1. 加密内容
      const { encryptedBlob, shareId } = await encryptContentWithSeal(textContent);
      
      // 2. 创建分享链接
      const mockBlobId = 'mock-blob-id-' + Date.now();
      const sealShareLink = `https://example.com/${shareId}:${mockBlobId}`;
      
      // 从分享链接中提取信息
      const path = sealShareLink.substring('https://example.com/'.length);
      const [extractedShareId, extractedBlobId] = path.split(':');
      
      // 验证解析结果
      expect(extractedShareId).toBe(shareId);
      expect(extractedBlobId).toBe(mockBlobId);
      
      // 验证shareId格式
      expect(shareId.startsWith('sl')).toBe(true);
    });
    
    it('应该能处理带有参数的Seal链接', async () => {
      // 模拟Seal分享链接
      const shareId = 'sl' + toBase58(new Uint8Array(32).fill(1));
      const blobId = 'mock-blob-id-' + Date.now();
      const sealShareLink = `https://example.com/${shareId}:${blobId}?utm_source=test`;
      
      // 从分享链接中提取信息
      const url = new URL(sealShareLink);
      const path = url.pathname.substring(1); // 移除开头的 /
      const [extractedShareId, extractedBlobId] = path.split(':');
      
      // 验证解析结果
      expect(extractedShareId).toBe(shareId);
      expect(extractedBlobId).toBe(blobId);
      expect(url.searchParams.get('utm_source')).toBe('test');
    });
  });
  
  describe('链接格式异常处理测试', () => {
    it('应该能识别无效的传统分享链接', () => {
      // 创建一个无效的分享链接
      const invalidShareLink = 'https://example.com/invalid-key-format';
      
      // 尝试解析
      expect(() => {
        const extractedCompositeKey = invalidShareLink.substring('https://example.com/'.length);
        decodeCompositeKey(extractedCompositeKey);
      }).toThrow();
    });
    
    it('应该能识别无效的Seal分享链接', () => {
      // 创建一个无效的Seal分享链接
      const invalidSealLink = 'https://example.com/invalid-prefix-123:blob-id';
      
      // 从分享链接中提取信息
      const path = invalidSealLink.substring('https://example.com/'.length);
      const [extractedShareId, extractedBlobId] = path.split(':');
      
      // 验证前缀校验
      expect(extractedShareId.startsWith('sl')).toBe(false);
    });
  });
}); 