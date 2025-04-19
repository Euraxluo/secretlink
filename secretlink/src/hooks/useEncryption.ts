import { useState, useCallback, useEffect } from 'react'
import { encryptAndPrepareForUpload, encryptDemo, decryptDemo, decryptUploadedContent } from '../helper/encryption'
import { toBase58, fromBase58 } from '../helper/base58'
import { encodeCompositeKey, decodeCompositeKey } from '../helper/encoding'
import { storeEncryptedData, extractEncryptedData } from '../helper/id'
import { SecureContent } from '../components/ContextViewer'
import { WalrusClient } from '../components/WalrusClient'
import { LATEST_KEY_VERSION, WALRUS_AGGREGATOR } from '../config/constants'
import { encryptContentWithSeal, decryptContentWithSeal } from '../helper/seal-crypto'

// 使用Seal优化加密的标志
const USE_SEAL_OPTIMIZATION = true;

interface DecryptData {
    id: string
    encryptionKey: Uint8Array
    version: number
}

// Seal解密数据格式
interface SealDecryptData {
    shareId: string;
    isSeal: boolean;
}

export const useEncryption = () => {
    // Demo加密状态
    const [demoText, setDemoText] = useState('')
    const [encodeText, setEncodeText] = useState('')
    const [isDemoEncrypting, setIsDemoEncrypting] = useState(false)
    const [isDemoDecrypting, setIsDemoDecrypting] = useState(false)
    
    // 内容加密状态
    const [isUploading, setIsUploading] = useState(false)
    const [shareLink, setShareLink] = useState('')
    const [contentToEncrypt, setContentToEncrypt] = useState<SecureContent | null>(null)
    const [encryptionProgress, setEncryptionProgress] = useState({step: 0, message: ''})
    
    // 内容解密状态
    const [isDecrypting, setIsDecrypting] = useState(false)
    const [decryptedContent, setDecryptedContent] = useState<SecureContent | null>(null)
    const [contentToDecrypt, setContentToDecrypt] = useState<DecryptData | null>(null)
    const [sealContentToDecrypt, setSealContentToDecrypt] = useState<SealDecryptData | null>(null)
    const [decryptionProgress, setDecryptionProgress] = useState({step: 0, message: ''})
    
    // Walrus 配置
    const [customPublisherUrl, setCustomPublisherUrl] = useState<string | undefined>(undefined)
    const [customAggregatorUrl, setCustomAggregatorUrl] = useState<string | undefined>(undefined)
    
    // 存储Demo加密数据
    let demoData: Array<{encrypted: string; iv: string}> = []
    
    // Demo加密效果
    useEffect(() => {
        if (isDemoEncrypting) {
            const interval = setInterval(async () => {
                setDemoText(prevText => {
                    if (prevText.length >= 20) {
                        setIsDemoEncrypting(false)
                        encryptDemoCallback(demoText)
                        return '🔒 Encrypted!'
                    }
                    return prevText + String.fromCharCode(Math.floor(Math.random() * 26) + 97)
                })
            }, 100)
            return () => clearInterval(interval)
        }
    }, [isDemoEncrypting, demoText])

    // Demo解密效果
    useEffect(() => {
        if (isDemoDecrypting) {
            decryptDemoCallback(encodeText).then(() => {
                setIsDemoDecrypting(false)
            })
        }
    }, [isDemoDecrypting, encodeText])
    
    // Demo加密回调
    const encryptDemoCallback = useCallback(async (text: string) => {
        console.log("encryptCallback demoText", text)
        const {encrypted, iv, key} = await encryptDemo(text)
        const id = toBase58(storeEncryptedData(demoData.length + ''))
        const compositeKey = encodeCompositeKey(LATEST_KEY_VERSION, id, key)
        demoData = [...demoData, {
            encrypted: toBase58(encrypted),
            iv: toBase58(iv)
        }]
        console.log("encryptCallback compositeKey", compositeKey)
        setEncodeText(compositeKey)
        return compositeKey
    }, [])

    // Demo解密回调
    const decryptDemoCallback = useCallback(async (compositeKey: string) => {
        console.log("decryptCallback compositeKey", compositeKey)
        const {id, encryptionKey, version} = decodeCompositeKey(compositeKey)
        const index = extractEncryptedData(fromBase58(id))
        console.log(index)
        try {
            const data = demoData[parseInt(index)]
            const decrypted = await decryptDemo(data.encrypted, encryptionKey, data.iv, version)
            console.log("decryptCallback decrypted", decrypted)
            setDemoText(decrypted)
        } catch (error) {
            console.error("Failed to decrypt:", error)
        }
    }, [])
    
    // 处理上传内容加密
    const handleUpload = async (content: SecureContent) => {
        setIsUploading(true)
        setEncryptionProgress({step: 1, message: 'Preparing content for encryption...'})
        setContentToEncrypt(content)
    }
    
    // 处理分享链接解密
    const handleDecrypt = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsDecrypting(true)
        setDecryptionProgress({step: 1, message: 'Decoding share link...'})
        try {
            console.info("shareLink", shareLink)
            // 去除域名部分
            const shareId = shareLink.substring((window.location.origin + "/").length);
            
            // 检测是否是Seal优化的链接格式
            if (shareId.startsWith('sl') && USE_SEAL_OPTIMIZATION) {
                console.log('检测到Seal优化的分享链接');
                setSealContentToDecrypt({
                    shareId,
                    isSeal: true
                });
            } else {
                // 使用原来的解密方式
                console.log('使用传统方式解密');
                setContentToDecrypt(decodeCompositeKey(shareId));
                setSealContentToDecrypt(null);
            }
        } catch (error) {
            console.info('Decryption failed:', error)
            setDecryptionProgress({step: 0, message: 'Decryption failed. Please try again.'})
            setIsDecrypting(false)
        }
    }
    
    // 实际加密处理 - 可能使用优化的Seal方法或原始方法
    const encryptCallback = useCallback(async () => {
        try {
            console.group('加密过程详细日志')
            console.log("开始加密过程，内容类型:", contentToEncrypt?.type)
            console.log("内容大小:", contentToEncrypt?.type === 'file' ? 
                (contentToEncrypt.content instanceof Blob ? contentToEncrypt.content.size + ' bytes' : '未知') : 
                (typeof contentToEncrypt?.content === 'string' ? contentToEncrypt.content.length + ' 字符' : '未知'))
            setEncryptionProgress({step: 2, message: 'Encrypting content...'})
            if (!contentToEncrypt) {
                throw new Error('No content to encrypt')
            }
            
            // 判断是否使用Seal优化加密
            if (USE_SEAL_OPTIMIZATION) {
                console.log("使用Seal优化加密方法...");
                try {
                    // 使用Seal优化的加密方法
                    const { encryptedData, shareId } = await encryptContentWithSeal(
                        contentToEncrypt,
                        (progress, message) => {
                            console.log(`加密进度: ${progress.toFixed(2)}% - ${message}`);
                            setEncryptionProgress({
                                step: 3,
                                message: `Encrypting: ${message} (${progress.toFixed(2)}%)`
                            });
                        }
                    );
                    
                    console.log("Seal优化加密完成，数据大小:", encryptedData.length, "字节");
                    setEncryptionProgress({step: 4, message: 'Storing encrypted data...'});
                    
                    // 使用Walrus存储加密数据
                    console.log("正在初始化WalrusClient...");
                    console.log("聚合器URL:", customAggregatorUrl || "使用默认值");
                    console.log("发布器URL:", customPublisherUrl || "使用默认值");
                    const client = new WalrusClient(customAggregatorUrl, customPublisherUrl);
                    
                    // 将 Uint8Array 转换为 Blob 进行存储
                    const encryptedBlob = new Blob([encryptedData]);
                    
                    console.log("开始存储加密数据...");
                    const blobId = await client.store(encryptedBlob);
                    console.log("存储完成，blobId:", blobId);
                    setEncryptionProgress({step: 5, message: 'Generating share link...'});
                    
                    // 生成最终的分享链接 - 简化格式
                    const finalShareLink = `${window.location.origin}/${shareId}:${blobId}`;
                    console.log("生成最终分享链接:", finalShareLink);
                    
                    setShareLink(finalShareLink);
                    setEncryptionProgress({step: 6, message: 'Encryption complete!'});
                    setIsUploading(false);
                    return finalShareLink;
                } catch (error) {
                    console.error("Seal优化加密失败:", error);
                    console.error("错误信息:", error instanceof Error ? error.message : '未知错误');
                    console.error("错误堆栈:", error instanceof Error ? error.stack : '未知错误');
                    throw error;
                }
            } else {
                // 使用原始加密方法
                console.log("使用原始加密方法...");
                try {
                    const {blob, key} = await encryptAndPrepareForUpload(
                        contentToEncrypt,
                        (progress, message) => {
                            console.log(`加密进度: ${progress.toFixed(2)}% - ${message}`);
                            setEncryptionProgress({
                                step: 3,
                                message: `Encrypting: ${message} (${progress.toFixed(2)}%)`
                            });
                        }
                    );
                    
                    // 使用原始方法存储和生成链接
                    console.log("加密完成，Blob大小:", blob.size, "字节");
                    setEncryptionProgress({step: 4, message: 'Storing encrypted blob data...'});
                    
                    // ... 原始方法的后续代码 ...
                    console.log("正在初始化WalrusClient...");
                    console.log("聚合器URL:", customAggregatorUrl || "使用默认值");
                    console.log("发布器URL:", customPublisherUrl || "使用默认值");
                    const client = new WalrusClient(customAggregatorUrl, customPublisherUrl);
                    
                    console.log("开始存储加密数据...");
                    try {
                        console.log("请求参数: contentType='text/json', epoch=100");
                        const result = await client.store(blob, {
                            contentType: 'text/json',
                        });
                        console.log("存储结果:", result);
                        const id = result;
                        
                        setEncryptionProgress({step: 5, message: 'Generating share link...'});
                        console.log("生成分享链接...");
                        const encodedId = toBase58(storeEncryptedData(id));
                        console.log("编码后的ID:", encodedId);
                        const compositeKey = encodeCompositeKey(LATEST_KEY_VERSION, encodedId, key);
                        console.log("生成的复合密钥:", compositeKey);
                        const url = `${window.location.origin}/${compositeKey}`;
                        console.log("完整分享链接:", url);
                        setShareLink(url);
                        setIsUploading(false);
                        setEncryptionProgress({step: 6, message: 'Encryption complete!'});
                        navigator.clipboard.writeText(url).then(() => {
                            console.log("链接已复制到剪贴板");
                            // 成功后可以通知App显示confetti
                        }).catch(err => {
                            console.warn("无法复制链接到剪贴板:", err);
                        });
                    } catch (storeError) {
                        console.error("存储过程失败:", storeError);
                        if (storeError instanceof Error) {
                            console.error("错误信息:", storeError.message);
                            console.error("错误堆栈:", storeError.stack);
                        }
                        console.error("存储请求URL:", customPublisherUrl || WALRUS_AGGREGATOR);
                        throw new Error(`存储失败: ${storeError instanceof Error ? storeError.message : '未知错误'}`);
                    }
                } catch (prepareError) {
                    console.error("准备上传数据过程失败:", prepareError);
                    if (prepareError instanceof Error) {
                        console.error("错误信息:", prepareError.message);
                        console.error("错误堆栈:", prepareError.stack);
                    }
                    throw prepareError;
                }
            }
            
            console.groupEnd();
        } catch (error) {
            console.error('加密总过程失败, 详细错误:', error);
            if (error instanceof Error) {
                console.error('错误消息:', error.message);
                console.error('错误堆栈:', error.stack);
            }
            setEncryptionProgress({step: 0, message: `Encrypting failed! 原因: ${error instanceof Error ? error.message : '未知错误'}`});
            setIsUploading(false);
            console.groupEnd();
        }
    }, [contentToEncrypt, customAggregatorUrl, customPublisherUrl]);

    // 实际解密处理 - 处理常规解密和Seal优化解密两种情况
    const decryptCallback = useCallback(async () => {
        try {
            console.group('解密过程详细日志');
            
            // 判断是使用Seal优化解密还是原始解密
            if (sealContentToDecrypt && sealContentToDecrypt.isSeal) {
                // 使用Seal优化解密
                setDecryptionProgress({step: 2, message: 'Processing Seal optimized share link...'});
                console.log("使用Seal优化解密方法，shareId:", sealContentToDecrypt.shareId);
                
                // 分离shareId和blobId
                const [shareId, blobId] = sealContentToDecrypt.shareId.split(':');
                
                if (!blobId) {
                    throw new Error('分享链接格式无效，缺少blobId');
                }
                
                console.log("提取的shareId:", shareId, "blobId:", blobId);
                setDecryptionProgress({step: 3, message: 'Retrieving encrypted data...'});
                
                // 使用WalrusClient获取加密数据
                console.log("初始化WalrusClient...");
                console.log("聚合器URL:", customAggregatorUrl || "使用默认值");
                console.log("发布器URL:", customPublisherUrl || "使用默认值");
                const client = new WalrusClient(customAggregatorUrl, customPublisherUrl);
                
                try {
                    // 获取加密数据
                    console.log("从存储服务获取加密数据...");
                    const encryptedBlob = await client.retrieve(blobId, { asBlob: true });
                    console.log("获取的加密数据大小:", encryptedBlob.size, "字节");
                    
                    setDecryptionProgress({step: 4, message: 'Decrypting with Seal...'});
                    
                    // 将Blob转换为Uint8Array
                    const arrayBuffer = await encryptedBlob.arrayBuffer();
                    const encryptedData = new Uint8Array(arrayBuffer);
                    
                    // 使用Seal优化解密
                    try {
                        const decryptedContent = await decryptContentWithSeal(
                            shareId,
                            encryptedData,
                            (progress, message) => {
                                console.log(`解密进度: ${progress.toFixed(2)}% - ${message}`);
                                setDecryptionProgress({
                                    step: 5,
                                    message: `Decrypting: ${message} (${progress.toFixed(2)}%)`
                                });
                            }
                        );
                        
                        console.log("Seal解密成功，内容类型:", decryptedContent.type);
                        setDecryptedContent(decryptedContent);
                        setDecryptionProgress({step: 6, message: 'Decryption complete!'});
                    } catch (decryptError) {
                        console.error("Seal解密失败:", decryptError);
                        throw new Error(`Seal解密失败: ${decryptError instanceof Error ? decryptError.message : '未知错误'}`);
                    }
                } catch (retrieveError) {
                    console.error("获取加密数据失败:", retrieveError);
                    throw new Error(`获取加密数据失败: ${retrieveError instanceof Error ? retrieveError.message : '未知错误'}`);
                }
            } else if (contentToDecrypt) {
                // 使用原始解密方法
                setDecryptionProgress({step: 2, message: 'Extracting encrypted data...'});
                console.log("使用原始解密方法, 密文ID:", contentToDecrypt.id);
                
                try {
                    const blobId = extractEncryptedData(fromBase58(contentToDecrypt.id));
                    console.log("解析后的Blob ID:", blobId);
                    setDecryptionProgress({step: 3, message: 'Retrieving data from storage...'});
                    
                    // 使用WalrusClient获取加密数据
                    console.log("初始化WalrusClient...");
                    console.log("聚合器URL:", customAggregatorUrl || "使用默认值");
                    console.log("发布器URL:", customPublisherUrl || "使用默认值");
                    const client = new WalrusClient(customAggregatorUrl, customPublisherUrl);
                    
                    console.log("开始从存储服务检索数据, 请求URL:", `${customAggregatorUrl || WALRUS_AGGREGATOR}/${blobId}`);
                    try {
                        const data = await client.retrieve(blobId, {asBlob: true});
                        console.log("检索到的数据大小:", data.size, "字节");
                        
                        setDecryptionProgress({step: 4, message: 'Decrypting content...'});
                        
                        console.log("开始解密内容...");
                        try {
                            const decryptedData = await decryptUploadedContent(
                                data,
                                contentToDecrypt.encryptionKey,
                                (progress, message) => {
                                    console.log(`解密进度: ${progress.toFixed(2)}% - ${message}`);
                                    setDecryptionProgress({
                                        step: 5,
                                        message: `Decrypting: ${message} (${progress.toFixed(2)}%)`
                                    });
                                }
                            );
                            
                            console.log("解密完成，内容类型:", decryptedData.type);
                            if (decryptedData.type === 'file') {
                                console.log("文件名:", decryptedData.fileName);
                                console.log("文件类型:", decryptedData.fileType);
                                console.log("文件大小:", decryptedData.content instanceof Blob ? decryptedData.content.size : "未知");
                            }
                            
                            setDecryptedContent(decryptedData);
                            setDecryptionProgress({step: 6, message: 'Decryption complete!'});
                            console.log("解密过程全部完成");
                        } catch (decryptError) {
                            console.error("解密内容过程失败:", decryptError);
                            if (decryptError instanceof Error) {
                                console.error("错误信息:", decryptError.message);
                                console.error("错误堆栈:", decryptError.stack);
                            }
                            throw new Error(`解密失败: ${decryptError instanceof Error ? decryptError.message : '未知错误'}`);
                        }
                    } catch (retrieveError) {
                        console.error("数据检索过程失败:", retrieveError);
                        if (retrieveError instanceof Error) {
                            console.error("错误信息:", retrieveError.message);
                            console.error("错误堆栈:", retrieveError.stack);
                        }
                        throw new Error(`检索数据失败: ${retrieveError instanceof Error ? retrieveError.message : '未知错误'}`);
                    }
                } catch (extractError) {
                    console.error("提取加密数据过程失败:", extractError);
                    if (extractError instanceof Error) {
                        console.error("错误信息:", extractError.message);
                        console.error("错误堆栈:", extractError.stack);
                    }
                    throw new Error(`提取数据失败: ${extractError instanceof Error ? extractError.message : '未知错误'}`);
                }
            } else {
                throw new Error('没有可解密的内容');
            }
            
            console.groupEnd();
        } catch (error) {
            console.error('解密总过程失败, 详细错误:', error);
            if (error instanceof Error) {
                console.error('错误消息:', error.message);
                console.error('错误堆栈:', error.stack);
            }
            setDecryptionProgress({step: 0, message: `Decryption failed! 原因: ${error instanceof Error ? error.message : '未知错误'}`});
            setIsDecrypting(false);
            console.groupEnd();
        }
    }, [contentToDecrypt, sealContentToDecrypt, customAggregatorUrl, customPublisherUrl]);
    
    // 监听加密内容变化
    useEffect(() => {
        if (contentToEncrypt) {
            encryptCallback();
        }
    }, [contentToEncrypt, encryptCallback]);

    // 监听解密内容变化
    useEffect(() => {
        if (contentToDecrypt || sealContentToDecrypt) {
            decryptCallback();
        }
    }, [contentToDecrypt, sealContentToDecrypt, decryptCallback]);
    
    return {
        // Demo相关
        demoText,
        setDemoText,
        encodeText,
        setEncodeText,
        isDemoEncrypting,
        setIsDemoEncrypting,
        isDemoDecrypting,
        setIsDemoDecrypting,
        
        // 加密相关
        isUploading,
        shareLink,
        setShareLink,
        encryptionProgress,
        handleUpload,
        
        // 解密相关
        isDecrypting,
        decryptedContent,
        decryptionProgress,
        handleDecrypt,
        
        // Walrus 配置
        setCustomPublisherUrl,
        setCustomAggregatorUrl,
        
        // Seal优化标志
        usesSealOptimization: USE_SEAL_OPTIMIZATION
    };
} 