import { WalrusClientOptions } from '../common/types'
import { WALRUS_AGGREGATOR, WALRUS_PUBLISHER } from '../config/constants'

/**
 * 存储选项
 */
export interface StoreOptions extends WalrusClientOptions {
    epoch?: number
    name?: string
}

/**
 * 检索选项
 */
export interface RetrieveOptions extends WalrusClientOptions {
    contentType?: string
}

/**
 * 存储响应类型
 */
interface StoreResponse {
    newlyCreated?: {
        blobObject: {
            blobId: string;
        };
    };
    alreadyCertified?: {
        blobId: string;
    };
}

/**
 * WalrusClient 客户端类
 * 用于与 Walrus 存储服务进行交互
 */
export class WalrusClient {
    private aggregator: string
    private publisher: string
    
    /**
     * 创建WalrusClient实例
     * @param aggregator - 聚合器URL，默认使用constants.ts中的WALRUS_AGGREGATOR
     * @param publisher - 发布器URL，默认使用constants.ts中的WALRUS_PUBLISHER
     */
    constructor(aggregator?: string, publisher?: string) {
        this.aggregator = aggregator || WALRUS_AGGREGATOR
        this.publisher = publisher || WALRUS_PUBLISHER
    }
    
    /**
     * 存储数据到 Walrus
     * @param data - 要存储的数据
     * @param options - 存储选项
     * @returns 存储结果的blobId
     */
    async store(data: string | number | object | Blob, options?: StoreOptions): Promise<string> {
        let contentType = options?.contentType || 'text/plain'
        const epoch = options?.epoch || 1
        let body: string | Blob = ''
        
        // 根据不同的数据类型进行处理
        if (data instanceof Blob) {
            body = data
            contentType = data.type || contentType
        } else if (typeof data === 'object') {
            body = JSON.stringify(data)
            contentType = 'application/json'
        } else {
            body = data.toString()
        }
        
        // 如果明确指定了 contentType，则覆盖默认值
        if (options?.contentType) {
            contentType = options.contentType
        }
        
        // 构建请求选项
        const headers = new Headers()
        headers.append('Content-Type', contentType)
        headers.append('Access-Control-Allow-Origin', '*')
        
        const requestOptions: RequestInit = {
            method: 'PUT',
            headers,
            body,
            redirect: 'follow'
        }
        
        // 构建URL，处理epoch参数
        let url = `${this.publisher}/v1/blobs`
        if (epoch > 1) {
            url += `?epochs=${epoch}`
        }
        
        try {
            // 发送请求
            const response = await fetch(url, requestOptions)
            
            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`Failed to store data: ${response.statusText}. Server response: ${errorText}`)
            }
            
            // 解析响应并提取blobId
            const responseData = await response.json() as StoreResponse
            const blobId = responseData.newlyCreated?.blobObject?.blobId || 
                          responseData.alreadyCertified?.blobId || 
                          'temp-' + Date.now()
            return blobId
        } catch (error) {
            console.error(`存储请求出错:`, error)
            throw error
        }
    }
    
    /**
     * 从 Walrus 检索数据
     * @param blobId - 要检索的Blob ID
     * @param options - 检索选项
     * @returns 检索到的数据
     */
    async retrieve(blobId: string, options?: RetrieveOptions): Promise<any> {
        const asBlob = options?.asBlob !== undefined ? options.asBlob : true
        const contentType = options?.contentType || 'application/octet-stream'
        const url = `${this.aggregator}/v1/blobs/${blobId}`
        
        try {
            const response = await fetch(url)
            
            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`Failed to retrieve data: ${response.statusText}. Server response: ${errorText}`)
            }
            
            // 根据 asBlob 选项返回不同格式的数据
            if (!asBlob) {
                try {
                    return await response.json()
                } catch {
                    try {
                        const text = await response.text()
                        const num = Number(text)
                        if (!isNaN(num)) {
                            return num
                        }
                        return text
                    } catch (error) {
                        throw error
                    }
                }
            }
            
            // 返回为 Blob
            const blob = await response.blob()
            return new Blob([blob], { type: contentType })
        } catch (error) {
            console.error(`检索请求出错:`, error)
            throw error
        }
    }
} 