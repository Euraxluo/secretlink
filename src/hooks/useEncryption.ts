// 实际加密处理
const encryptCallback = useCallback(async () => {
    try {
        console.group('加密过程')
        console.log("开始加密过程，内容类型:", contentToEncrypt?.type);
        setEncryptionProgress({step: 2, message: 'Encrypting content...'})
        if (!contentToEncrypt) {
            throw new Error('No content to encrypt')
        }
        
        console.log("调用encryptAndPrepareForUpload方法...");
        const {blob, key} = await encryptAndPrepareForUpload(
            contentToEncrypt,
            (progress, message) => {
                console.log(`加密进度: ${progress.toFixed(2)}% - ${message}`)
                setEncryptionProgress({
                    step: 3,
                    message: `Encrypting: ${message} (${progress.toFixed(2)}%)`
                })
            }
        )

        console.log("加密完成，Blob大小:", blob.size, "字节");
        setEncryptionProgress({step: 4, message: 'Storing encrypted blob data...'})
        
        // 使用我们的WalrusClient模拟类，支持自定义URL
        console.log("正在初始化WalrusClient...");
        console.log("聚合器URL:", customAggregatorUrl || "使用默认值");
        console.log("发布器URL:", customPublisherUrl || "使用默认值");
        const client = new WalrusClient(customAggregatorUrl, customPublisherUrl)
        
        console.log("开始存储加密数据...");
        try {
            const result = await client.store(blob, {
                contentType: 'text/json',
                epoch: 100 // 指定epoch为100，提高数据存储的持久性
            })
            console.log("存储结果:", result);
            let id = ''
            if (result && 'newlyCreated' in result && result.newlyCreated) {
                id = result.newlyCreated.blobObject.blobId
                console.log("创建了新的Blob，ID:", id);
            } else if (result && 'alreadyCertified' in result && result.alreadyCertified) {
                id = result.alreadyCertified.blobId
                console.log("使用已认证的Blob，ID:", id);
            } else {
                id = 'temp-id-' + Date.now() // 兜底处理
                console.log("无法从响应中获取Blob ID，使用临时ID:", id);
            }
            
            setEncryptionProgress({step: 5, message: 'Generating share link...'})
            console.log("生成分享链接...");
            const encodedId = toBase58(storeEncryptedData(id));
            console.log("编码后的ID:", encodedId);
            const compositeKey = encodeCompositeKey(LATEST_KEY_VERSION, encodedId, key)
            console.log("生成的复合密钥:", compositeKey);
            const url = `${window.location.origin}/${compositeKey}`
            console.log("完整分享链接:", url);
            setShareLink(url)
            setIsUploading(false)
            setEncryptionProgress({step: 6, message: 'Encryption complete!'})
            navigator.clipboard.writeText(url).then(() => {
                console.log("链接已复制到剪贴板");
                // 成功后可以通知App显示confetti
            }).catch(err => {
                console.warn("无法复制链接到剪贴板:", err);
            })
        } catch (storeError) {
            console.error("存储过程失败:", storeError);
            throw storeError; // 重新抛出以便被外层catch捕获
        }
        console.groupEnd();
    } catch (error) {
        console.error('加密失败, 详细错误:', error);
        if (error instanceof Error) {
            console.error('错误消息:', error.message);
            console.error('错误堆栈:', error.stack);
        }
        setEncryptionProgress({step: 0, message: `Encrypting failed! 原因: ${error instanceof Error ? error.message : '未知错误'}`})
        setIsUploading(false);
        console.groupEnd();
    }
}, [contentToEncrypt, customAggregatorUrl, customPublisherUrl])

// 实际解密处理
const decryptCallback = useCallback(async () => {
    try {
        console.group('解密过程');
        setDecryptionProgress({step: 2, message: 'Extracting encrypted data...'})
        console.log("开始解密过程, 密文ID:", contentToDecrypt?.id);
        if (!contentToDecrypt) {
            throw new Error('No content to decrypt')
        }
        
        const blobId = extractEncryptedData(fromBase58(contentToDecrypt.id))
        console.log("解析后的Blob ID:", blobId);
        setDecryptionProgress({step: 3, message: 'Retrieving data from storage...'})
        
        // 使用我们的WalrusClient模拟类，支持自定义URL
        console.log("初始化WalrusClient...");
        console.log("聚合器URL:", customAggregatorUrl || "使用默认值");
        console.log("发布器URL:", customPublisherUrl || "使用默认值");
        const client = new WalrusClient(customAggregatorUrl, customPublisherUrl)
        
        console.log("开始从存储服务检索数据...");
        try {
            const data = await client.retrieve(blobId, {asBlob: true})
            console.log("检索到的数据大小:", data.size, "字节");
            
            setDecryptionProgress({step: 4, message: 'Decrypting content...'})
            
            console.log("开始解密内容...");
            const decryptedData = await decryptUploadedContent(
                data,
                contentToDecrypt.encryptionKey,
                (progress, message) => {
                    console.log(`解密进度: ${progress.toFixed(2)}% - ${message}`)
                    setDecryptionProgress({
                        step: 5,
                        message: `Decrypting: ${message} (${progress.toFixed(2)}%)`
                    })
                }
            )
            
            console.log("解密完成，内容类型:", decryptedData.type);
            if (decryptedData.type === 'file') {
                console.log("文件名:", decryptedData.fileName);
                console.log("文件类型:", decryptedData.fileType);
                console.log("文件大小:", decryptedData.content instanceof Blob ? decryptedData.content.size : "未知");
            }
            
            setDecryptedContent(decryptedData)
            setDecryptionProgress({step: 6, message: 'Decryption complete!'})
            console.log("解密过程全部完成");
        } catch (retrieveError) {
            console.error("数据检索过程失败:", retrieveError);
            throw retrieveError; // 重新抛出以便被外层catch捕获
        }
        console.groupEnd();
    } catch (error) {
        console.error('解密失败, 详细错误:', error);
        if (error instanceof Error) {
            console.error('错误消息:', error.message);
            console.error('错误堆栈:', error.stack);
        }
        setDecryptionProgress({step: 0, message: `Decryption failed! 原因: ${error instanceof Error ? error.message : '未知错误'}`})
        setIsDecrypting(false);
        console.groupEnd();
    }
}, [contentToDecrypt, customAggregatorUrl, customPublisherUrl]) 