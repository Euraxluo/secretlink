import { useEffect, useState } from 'react';
import { SealClient, SessionKey } from '@mysten/seal';
import { SuiClient } from '@mysten/sui/client';
import * as React from 'react';

// Seal配置
interface SealConfig {
  packageId: string;
  serverObjectIds: string[];
  suiClient: SuiClient;
}

export interface SealEncryptOptions {
  id: string; // 内部ID，可以是较短的标识符
  data: Uint8Array; // 待加密数据
  threshold?: number; // 解密所需的密钥门限，默认为1
  aad?: Uint8Array; // 额外认证数据
}

// 初始化Seal客户端，提供加密解密服务
export class SealService {
  private client: SealClient;
  private packageId: string;

  constructor(config: SealConfig) {
    this.client = new SealClient({
      suiClient: config.suiClient,
      serverObjectIds: config.serverObjectIds
    });
    this.packageId = config.packageId;
  }

  /**
   * 使用Seal加密数据
   * @param options 加密选项
   * @returns 加密后的数据和ID
   */
  async encrypt(options: SealEncryptOptions) {
    console.log('使用Seal加密数据，ID:', options.id);

    try {
      const encrypted = await this.client.encrypt({
        threshold: options.threshold || 1,
        packageId: this.packageId,
        id: options.id,
        data: options.data,
        aad: options.aad
      });

      console.log('Seal加密成功，生成短链接');
      
      // 返回加密结果和ID，ID可以作为短链接的一部分
      return {
        encryptedData: encrypted,
        id: options.id
      };
    } catch (error) {
      console.error('Seal加密失败:', error);
      throw new Error(`Seal加密失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 使用Seal解密数据
   * @param encryptedData 加密数据
   * @param id 数据ID
   * @param address 用户地址
   * @returns 解密后的数据
   */
  async decrypt(encryptedData: Uint8Array, id: string, address: string) {
    console.log('使用Seal解密数据，ID:', id);

    try {
      // 创建会话密钥
      const sessionKey = new SessionKey({
        address,
        packageId: this.packageId,
        ttlMin: 10
      });

      // 获取证书
      const certificate = await sessionKey.getCertificate();
      console.log('获取到解密证书');

      // 解密数据
      const decrypted = await this.client.decrypt({
        data: encryptedData,
        sessionKey,
        txBytes: certificate as unknown as Uint8Array // 类型转换
      });

      console.log('Seal解密成功');
      return decrypted;
    } catch (error) {
      console.error('Seal解密失败:', error);
      throw new Error(`Seal解密失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
}

// React Hook组件，提供Seal服务
export function useSeal(config: SealConfig) {
  const [sealService, setSealService] = useState<SealService | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const service = new SealService(config);
      setSealService(service);
      setIsInitialized(true);
    } catch (err) {
      console.error('初始化Seal服务失败:', err);
      setError(err instanceof Error ? err.message : '初始化Seal服务失败');
    }
  }, [config.packageId, config.serverObjectIds.join(',')]);

  return {
    sealService,
    isInitialized,
    error
  };
}

export default function SealComponent() {
  return <div>Seal加密组件</div>;
}
