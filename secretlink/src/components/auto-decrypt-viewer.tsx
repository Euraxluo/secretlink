import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { decodeCompositeKey } from '../helper/encoding'
import { decryptUploadedContent } from '../helper/encryption'
import { decryptContentWithSeal } from '../helper/seal-crypto'
import { extractEncryptedData } from '../helper/id'
import { fromBase58 } from '../helper/base58'
import { useParams, useSearchParams } from "react-router-dom"
import * as React from 'react'
import { WalrusClient } from './WalrusClient'
import ContentViewer, { SecureContent } from './ContextViewer'

const BLOB_ID_LENGTH = 43
const SEAL_PREFIX = 'sl'

export default function AutoDecryptViewer() {
    const [decryptedContent, setDecryptedContent] = useState<SecureContent | null>(null)
    const [error, setError] = useState<string | null>(null)
    const { secretlink } = useParams<{ secretlink: string }>()
    const [searchParams] = useSearchParams()
    const mimetype = searchParams.get('mimetype')
    console.log('secretlink', secretlink)
    console.log('mimetype', mimetype)

    useEffect(() => {
        const processContent = async () => {
            if (!secretlink) {
                setError('No secret link provided')
                return
            }

            try {
                const client = new WalrusClient()
                let blobId: string
                let needsDecryption = false
                let isSealFormat = false
                let shareId = ''

                // 检查是否为Seal格式链接
                if (secretlink.startsWith(SEAL_PREFIX) && secretlink.includes(':')) {
                    isSealFormat = true
                    // 处理URL中的封装格式
                    let sealUrl = secretlink;
                    
                    // 检查是否有多个冒号，如果有，使用第一个冒号分割
                    const colonIndex = sealUrl.indexOf(':');
                    if (colonIndex !== -1) {
                        shareId = sealUrl.substring(0, colonIndex);
                        blobId = sealUrl.substring(colonIndex + 1);
                    } else {
                        // 兜底处理
                        const parts = sealUrl.split(':');
                        shareId = parts[0];
                        blobId = parts.length > 1 ? parts[1] : '';
                    }
                    
                    console.log('检测到Seal格式链接, shareId:', shareId, 'blobId:', blobId);
                    
                    // 检查shareId是否有sl前缀
                    if (!shareId.startsWith(SEAL_PREFIX)) {
                        console.error('警告: shareId 没有 sl 前缀, 将添加');
                        shareId = SEAL_PREFIX + shareId;
                    }
                    
                    // 打印更多调试信息
                    console.log('最终处理的shareId:', shareId);
                    console.log('shareId长度:', shareId.length);
                    console.log('blobId长度:', blobId.length);
                    
                    needsDecryption = true
                } else if (secretlink.length === BLOB_ID_LENGTH) {
                    blobId = secretlink
                    console.log('检测到原始Blob ID:', blobId)
                } else {
                    // 传统格式链接
                    needsDecryption = true
                    console.log('检测到传统格式链接')
                    const { id, encryptionKey } = decodeCompositeKey(secretlink)
                    blobId = extractEncryptedData(fromBase58(id))
                    console.log('提取的Blob ID:', blobId)

                    if (!encryptionKey) {
                        throw new Error('No encryption key found in the secret link')
                    }
                }

                console.log('开始从存储服务获取数据...')
                const data: Blob = await client.retrieve(blobId, { asBlob: true })
                console.log('获取到的数据大小:', data.size, 'bytes')

                if (needsDecryption) {
                    if (isSealFormat) {
                        // 使用Seal优化格式解密
                        console.log('使用Seal优化方式解密数据...')
                        try {
                            // 清理shareId中可能的特殊字符
                            if (shareId.includes(':')) {
                                console.warn('警告: shareId仍包含冒号，进行清理')
                                shareId = shareId.split(':')[0]
                            }
                            
                            // 检查格式
                            console.log('解密前的最终shareId:', shareId)
                            console.log('解密前的最终blobId:', blobId)
                            
                            // 将Blob转换为Uint8Array
                            const arrayBuffer = await data.arrayBuffer();
                            const uint8Array = new Uint8Array(arrayBuffer);
                            
                            const decrypted = await decryptContentWithSeal(
                                shareId,
                                uint8Array,
                                (progress, message) => {
                                    console.log(`解密进度: ${progress}% - ${message}`)
                                }
                            )
                            console.log('Seal解密成功, 内容类型:', decrypted.type)
                            setDecryptedContent(decrypted)
                        } catch (sealError) {
                            console.error('Seal解密失败:', sealError)
                            console.error('失败的shareId:', shareId)
                            console.error('数据大小:', data.size, 'bytes')
                            throw new Error('Failed to decrypt content using Seal format')
                        }
                    } else {
                        // 使用传统方式解密
                        console.log('使用传统方式解密数据...')
                        const { id, encryptionKey } = decodeCompositeKey(secretlink)
                        const decrypted = await decryptUploadedContent(data, encryptionKey!)
                        console.log('传统解密成功, 内容类型:', decrypted.type)
                        setDecryptedContent(decrypted)
                    }
                } else {
                    // 无需解密，直接展示
                    console.log('直接显示不需要解密的内容...')
                    const arrayBuffer = await data.arrayBuffer()
                    const decodedMimetype = mimetype ? decodeURIComponent(mimetype) : "application/octet-stream"
                    setDecryptedContent({
                        type: 'file',
                        content: new Uint8Array(arrayBuffer),
                        fileType: decodedMimetype,
                        timestamp: Date.now()
                    })
                }
            } catch (err) {
                console.error('Content processing failed:', err)
                setError('Failed to process content. Please check your link and try again.')
            }
        }

        processContent()
    }, [secretlink, mimetype])

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            </div>
        )
    }

    if (!decryptedContent) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
                <motion.div
                    className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <p className="mt-4 text-lg text-gray-600">Processing your content...</p>
                <p className="mt-2 text-sm text-gray-500">This may take a moment</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <ContentViewer data={decryptedContent} />
        </div>
    )
}