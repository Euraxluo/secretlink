# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh


```merimaid
sequenceDiagram
    participant S as 发送方(Sender)
    participant DEM as 数据封装模块(DEM)
    participant KDF as 密钥派生模块(KDF)
    participant W as Walrus存储服务
    participant R as 接收方(Receiver)
    
    Note over S,R: 加密流程
    S->>S: 1. 生成主密钥(Master Key)
    S->>S: 2. 生成随机nonce
    S->>KDF: 3. 请求派生加密密钥
    
    KDF->>KDF: 3.1 使用HMAC-SHA3-256
    KDF->>KDF: 3.2 结合salt和info
    KDF-->>S: 3.3 返回派生密钥
    
    S->>DEM: 4. 发送数据和派生密钥
    
    DEM->>DEM: 4.1 使用AES-GCM-256加密
    DEM->>DEM: 4.2 添加认证数据(AAD)
    DEM-->>S: 4.3 返回密文
    
    S->>S: 5. 构建数据包
    Note right of S: 版本+nonce长度+nonce+密文
    
    S->>S: 6. 生成分享ID
    Note right of S: SEAL_PREFIX + Base58(Master Key)
    
    S->>W: 7. 上传加密数据包
    W-->>S: 8. 返回Blob ID
    
    S->>S: 9. 生成最终分享链接
    Note right of S: shareId:blobId
    
    Note over S,R: 解密流程
    R->>R: 10. 解析分享链接
    R->>W: 11. 请求加密数据包
    W-->>R: 12. 返回数据包
    
    R->>R: 13. 从shareId提取主密钥
    R->>R: 14. 提取nonce
    
    R->>KDF: 15. 请求派生解密密钥
    KDF->>KDF: 15.1 重复密钥派生过程
    KDF-->>R: 15.2 返回派生密钥
    
    R->>DEM: 16. 发送密文和派生密钥
    DEM->>DEM: 16.1 验证认证数据
    DEM->>DEM: 16.2 AES-GCM-256解密
    DEM-->>R: 16.3 返回明文
    
    R->>R: 17. 解析和显示内容
```