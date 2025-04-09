import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encryptContentWithSeal, decryptContentWithSeal } from '../../src/helper/seal-crypto';
import { encryptAndPrepareForUpload, decryptUploadedContent } from '../../src/helper/encryption';
import { encodeCompositeKey, decodeCompositeKey } from '../../src/helper/encoding';
import { toBase58, fromBase58 } from '../../src/helper/base58';
import { LATEST_KEY_VERSION } from '../../src/config/constants';
import { SecureContent } from '../../src/components/ContextViewer';

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
        // 返回存储的数据
        return this._storedData || new Blob(['mock data']);
      });
      
      // 内部存储用于测试
      _storedData = null;
      
      // 设置存储数据的辅助方法
      _setStoredData(data) {
        this._storedData = data;
      }
    }
  };
});

// 模拟 storeEncryptedData 和 extractEncryptedData
vi.mock('../../src/helper/id', () => {
  const storageMap = new Map();
  let counter = 0;
  
  return {
    storeEncryptedData: vi.fn().mockImplementation((id) => {
      const idKey = `mock-id-${counter++}`;
      storageMap.set(idKey, id);
      return new Uint8Array([...idKey].map(c => c.charCodeAt(0)));
    }),
    
    extractEncryptedData: vi.fn().mockImplementation((encodedId) => {
      const idKey = new TextDecoder().decode(encodedId);
      return storageMap.get(idKey) || 'mock-fallback-id';
    }),
  };
});

// 集成测试
describe('加密解密流程集成测试', () => {
  // 测试数据
  let textContent: SecureContent;
  let fileContent: SecureContent;
  
  beforeEach(() => {
    const now = Date.now();
    
    textContent = {
      type: 'text',
      content: '这是测试文本内容，用于集成测试',
      timestamp: now
    };
    
    const blob = new Blob(['这是测试文件内容，用于集成测试'], { type: 'text/plain' });
    fileContent = {
      type: 'file',
      content: blob,
      fileType: 'text/plain',
      fileName: 'test.txt',
      timestamp: now
    };
  });
  
  describe('传统加密解密方式集成测试', () => {
    it('应该能完整加密和解密文本内容', async () => {
      // 1. 加密内容
      const { blob, key } = await encryptAndPrepareForUpload(textContent);
      
      // 2. 创建分享链接
      const mockId = 'mock-blob-id';
      const idBytes = new TextEncoder().encode(mockId);
      const encodedId = toBase58(idBytes);
      const compositeKey = encodeCompositeKey(LATEST_KEY_VERSION, encodedId, key);
      
      // 3. 从分享链接中解析信息
      const { id, encryptionKey, version } = decodeCompositeKey(compositeKey);
      
      expect(version).toBe(LATEST_KEY_VERSION);
      expect(Array.from(encryptionKey)).toEqual(Array.from(key));
      
      // 4. 解密内容
      const decryptedContent = await decryptUploadedContent(blob, encryptionKey);
      
      // 5. 验证结果
      expect(decryptedContent.type).toBe(textContent.type);
      expect(decryptedContent.content).toBe(textContent.content);
      expect(decryptedContent.timestamp).toBe(textContent.timestamp);
    });
    
    it('应该能完整加密和解密文件内容', async () => {
      // 1. 加密内容
      const { blob, key } = await encryptAndPrepareForUpload(fileContent);
      
      // 2. 模拟分享链接创建
      const mockId = 'mock-file-blob-id';
      const idBytes = new TextEncoder().encode(mockId);
      const encodedId = toBase58(idBytes);
      const compositeKey = encodeCompositeKey(LATEST_KEY_VERSION, encodedId, key);
      
      // 3. 从分享链接中解析信息
      const { encryptionKey } = decodeCompositeKey(compositeKey);
      
      // 4. 解密内容
      const decryptedContent = await decryptUploadedContent(blob, encryptionKey);
      
      // 5. 验证结果
      expect(decryptedContent.type).toBe(fileContent.type);
      expect(decryptedContent.fileType).toBe(fileContent.fileType);
      expect(decryptedContent.fileName).toBe(fileContent.fileName);
      
      // 验证文件内容
      const originalContent = await (fileContent.content as Blob).text();
      const decryptedFileContent = await (decryptedContent.content as Blob).text();
      expect(decryptedFileContent).toBe(originalContent);
    });
  });
  
  describe('Seal优化加密解密方式集成测试', () => {
    it('应该能完整加密和解密文本内容', async () => {
      // 1. 加密内容
      const { encryptedBlob, shareId } = await encryptContentWithSeal(textContent);
      
      // 2. 解密内容
      const decryptedContent = await decryptContentWithSeal(encryptedBlob, shareId);
      
      // 3. 验证结果
      expect(decryptedContent.type).toBe(textContent.type);
      expect(decryptedContent.content).toBe(textContent.content);
      expect(decryptedContent.timestamp).toBe(textContent.timestamp);
    });
    
    it('应该能完整加密和解密文件内容', async () => {
      // 1. 加密内容
      const { encryptedBlob, shareId } = await encryptContentWithSeal(fileContent);
      
      // 2. 解密内容
      const decryptedContent = await decryptContentWithSeal(encryptedBlob, shareId);
      
      // 3. 验证结果
      expect(decryptedContent.type).toBe(fileContent.type);
      expect(decryptedContent.fileType).toBe(fileContent.fileType);
      expect(decryptedContent.fileName).toBe(fileContent.fileName);
      
      // 验证文件内容
      const originalContent = await (fileContent.content as Blob).text();
      const decryptedFileContent = await (decryptedContent.content as Blob).text();
      expect(decryptedFileContent).toBe(originalContent);
    });
    
    it('Seal流程应该能处理大文件', async () => {
      // 创建一个较大的文件内容 (1 MB)
      const largeData = new Uint8Array(1 * 1024 * 1024); // 1 MB
      crypto.getRandomValues(largeData); // 填充随机数据
      
      const largeFileContent: SecureContent = {
        type: 'file',
        content: new Blob([largeData]),
        fileType: 'application/octet-stream',
        fileName: 'large-file.bin',
        timestamp: Date.now()
      };
      
      // 加密过程进度追踪
      const encryptProgressSpy = vi.fn();
      
      // 1. 加密内容
      const { encryptedBlob, shareId } = await encryptContentWithSeal(
        largeFileContent, 
        encryptProgressSpy
      );
      
      // 验证进度回调被多次调用
      expect(encryptProgressSpy).toHaveBeenCalled();
      expect(encryptProgressSpy.mock.calls.length).toBeGreaterThan(1);
      
      // 解密过程进度追踪
      const decryptProgressSpy = vi.fn();
      
      // 2. 解密内容
      const decryptedContent = await decryptContentWithSeal(
        encryptedBlob, 
        shareId, 
        decryptProgressSpy
      );
      
      // 验证进度回调被多次调用
      expect(decryptProgressSpy).toHaveBeenCalled();
      expect(decryptProgressSpy.mock.calls.length).toBeGreaterThan(1);
      
      // 3. 验证结果
      expect(decryptedContent.type).toBe('file');
      expect(decryptedContent.fileName).toBe(largeFileContent.fileName);
      
      // 验证文件内容匹配 - 使用 buffer 对比而不是字符串转换
      const decryptedBuffer = await (decryptedContent.content as Blob).arrayBuffer();
      const decryptedArray = new Uint8Array(decryptedBuffer);
      
      // 对比原始数据和解密后的数据
      expect(decryptedArray.length).toBe(largeData.length);
      
      // 由于数据太大，只对比前1000个字节和后1000个字节
      expect(Array.from(decryptedArray.slice(0, 1000)))
        .toEqual(Array.from(largeData.slice(0, 1000)));
      
      expect(Array.from(decryptedArray.slice(-1000)))
        .toEqual(Array.from(largeData.slice(-1000)));
    });
  });
  
  describe('不同加密方式的兼容性测试', () => {
    it('应该能处理不同版本的加密格式', async () => {
      // 使用不同版本格式测试兼容性
      // 这里可以参考实际需求设计更复杂的兼容性测试
      
      // 使用版本1和版本2测试
      for (const version of [1, 2]) {
        // 创建特定版本的测试内容
        const testContent: SecureContent = {
          type: 'text',
          content: `版本${version}的测试内容`,
          timestamp: Date.now()
        };
        
        // 加密内容
        const { blob, key } = await encryptAndPrepareForUpload(testContent);
        
        // 创建分享链接
        const mockId = `mock-v${version}-id`;
        const idBytes = new TextEncoder().encode(mockId);
        const encodedId = toBase58(idBytes);
        const compositeKey = encodeCompositeKey(version, encodedId, key);
        
        // 从分享链接中解析信息
        const { encryptionKey, version: decodedVersion } = decodeCompositeKey(compositeKey);
        
        expect(decodedVersion).toBe(version);
        
        // 解密内容
        const decryptedContent = await decryptUploadedContent(blob, encryptionKey);
        
        // 验证结果
        expect(decryptedContent.type).toBe(testContent.type);
        expect(decryptedContent.content).toBe(testContent.content);
      }
    });
  });
}); 