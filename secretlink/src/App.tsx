import * as React from 'react'
import { useEffect,useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Confetti from 'react-confetti'
import { 
    FaUpload, 
    FaLink, 
    FaInfo, 
    FaCog, 
    FaUserSecret 
} from 'react-icons/fa'
import { ConnectButton, Connector } from '@ant-design/web3'
import { useCurrentAccount } from '@mysten/dapp-kit'

// 组件引入
import NavButton from './components/NavButton'

// 页面引入
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import UploadPage from './pages/UploadPage'
import ViewPage from './pages/ViewPage'
// import SubscriptionPage from './pages/SubscriptionPage'

// 钩子引入
import { useEncryption } from './hooks/useEncryption'
import { useNavigation } from './hooks/useNavigation'

// 常量
const SUI_VIEW_TX_URL = `https://suiscan.xyz/testnet/tx`
const SUI_VIEW_OBJECT_URL = `https://suiscan.xyz/testnet/object`
const NUM_EPOCH = 1

export default function App() {
    const currentAccount = useCurrentAccount()
    console.log(currentAccount)
    
    // 使用导航钩子
    const { 
        activeSection, 
        setActiveSection, 
        showConfigInput, 
        setShowConfigInput, 
        publishUrl, 
        setPublishUrl, 
        showConfetti, 
        navigateToUpload, 
        handleConfigSubmit 
    } = useNavigation({
        onPublishUrlChange: (url) => {
            setCustomPublisherUrl(url);
        }
    })
    
    // 使用加密钩子
    const {
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
        
        // SEAL 访问控制配置
        // accessControl,
        // setAccessControl,
        // allowedAddresses,
        // setAllowedAddresses,
        // subscriptionFee,
        // setSubscriptionFee,
        // subscriptionDuration,
        // setSubscriptionDuration,
        // handleSubscribe,
        // setUserAddress,
    } = useEncryption()
    
     // // 订阅服务参数
    // const [subscriptionParams, setSubscriptionParams] = useState<{
    //     serviceId: string;
    //     fee: number;
    //     duration: number;
    // } | null>(null);
    
    // // 初始化shareLink
    // useEffect(() => {
    //     // 如果分享链接嵌入在URL中（例如通过其他方式分享），可以在这里提取
    //     // 不依赖于路由系统，仅作为可选功能
    //     if (window.location.search) {
    //         try {
    //             const params = new URLSearchParams(window.location.search);
    //             const link = params.get('link');
    //             if (link) {
    //                 setShareLink(link);
    //                 setActiveSection('view');
    //             }
    //         } catch (error) {
    //             console.error('无法解析URL参数:', error);
    //         }
    //     }
    // }, []);
    
    // // 在useEffect中添加对currentAccount的监听
    // useEffect(() => {
    //     if (currentAccount?.address) {
    //         // 将当前钱包地址传递给useEncryption
    //         setUserAddress(currentAccount.address);
    //     }
    // }, [currentAccount, setUserAddress]);
    
    // // 监听钱包连接状态
    // useEffect(() => {
    //     // 简单地记录钱包连接状态
    //     console.log('钱包连接状态:', !!currentAccount);
    // }, [currentAccount]);
    
    
    // 初始化shareLink
    useEffect(() => {
        if (window.location.pathname.length > 1) {
            setShareLink(window.location.href)
        }
    }, [])
    
    // 渲染内容
    const renderContent = () => {
        switch (activeSection) {
            case 'home':
                return (
                    <HomePage
                        onStart={navigateToUpload}
                        demoText={demoText}
                        encodeText={encodeText}
                        setDemoText={setDemoText}
                        setEncodeText={setEncodeText}
                        onEncrypt={() => setIsDemoEncrypting(true)}
                        onDecrypt={() => setIsDemoDecrypting(true)}
                    />
                )
            case 'about':
                return <AboutPage />
            case 'upload':
                return (
                    <UploadPage
                        isUploading={isUploading}
                        encryptionProgress={encryptionProgress}
                        shareLink={shareLink}
                        onUpload={handleUpload}
                    />
                // <UploadPage
                //     isUploading={isUploading}
                //     encryptionProgress={encryptionProgress}
                //     shareLink={shareLink}
                //     onUpload={handleUpload}
                //     accessControl={accessControl}
                //     setAccessControl={setAccessControl}
                //     allowedAddresses={allowedAddresses}
                //     setAllowedAddresses={setAllowedAddresses}
                //     subscriptionFee={subscriptionFee}
                //     setSubscriptionFee={setSubscriptionFee}
                //     subscriptionDuration={subscriptionDuration}
                //     setSubscriptionDuration={setSubscriptionDuration}
                // />
                )
            case 'view':
                return (
                    <ViewPage
                        shareLink={shareLink}
                        setShareLink={setShareLink}
                        isDecrypting={isDecrypting}
                        decryptionProgress={decryptionProgress}
                        decryptedContent={decryptedContent}
                        onDecrypt={handleDecrypt}
                    />
                )
            // case 'subscribe':
            //     // 订阅服务页面
            //     if (!subscriptionParams) {
            //         return <div>无效的订阅参数</div>;
            //     }
            //     return (
            //         <SubscriptionPage 
            //             serviceId={subscriptionParams.serviceId}
            //             fee={subscriptionParams.fee}
            //             duration={subscriptionParams.duration}
            //             onSubscribe={handleSubscribeRequest}
            //         />
            //     )
            default:
                return <HomePage 
                    onStart={navigateToUpload}
                    demoText={demoText}
                    encodeText={encodeText}
                    setDemoText={setDemoText}
                    setEncodeText={setEncodeText}
                    onEncrypt={() => setIsDemoEncrypting(true)}
                    onDecrypt={() => setIsDemoDecrypting(true)}
                />
        }
    }
    
    const buttonClasses = `
    flex items-center space-x-2 px-4 py-2 rounded-lg border-0
    bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400
    hover:from-blue-500 hover:via-cyan-100 hover:to-teal-500
    text-white font-medium text-sm
    shadow-lg shadow-cyan-900/30 hover:shadow-cyan-100/50
    transition-all duration-300 ease-in-out hover:scale-105`
    
    return (
        <div className="h-screen bg-gradient-to-br from-purple-400 to-indigo-600 flex flex-col p-4 items-center">
            <header className="mb-8 bg-white rounded-lg shadow-xl p-4 max-w-4xl w-full">
                <div className="container mx-auto flex justify-between items-center">
                    <div
                        className="text-2xl font-bold flex items-center text-indigo-500 transition-transform duration-200 ease-in-out hover:scale-105 active:scale-95 cursor-pointer"
                        onClick={() => setActiveSection('home')}
                    >
                        <FaUserSecret className="text-2xl text-indigo-500 mr-2"/>
                        SecretLink
                    </div>

                    <div className="flex items-center space-x-1">
                        {showConfigInput ? (
                            <form onSubmit={handleConfigSubmit} className="flex items-center">
                                <input
                                    type="text"
                                    placeholder={publishUrl}
                                    value={publishUrl}
                                    onChange={(e) => {
                                        setPublishUrl(e.target.value);
                                    }}
                                    className="ml-2 mr-1 w-32 sm:w-80"
                                />
                                <motion.button
                                    type="submit"
                                    whileHover={{scale: 1.1}}
                                    whileTap={{scale: 0.9}}
                                    className="p-2 rounded-full bg-indigo-100"
                                >
                                    Set
                                </motion.button>
                            </form>
                        ) : (
                            <>
                                <NavButton
                                    icon={<FaUpload/>}
                                    isActive={activeSection === 'upload'}
                                    onClick={() => setActiveSection('upload')}
                                />
                                <NavButton
                                    icon={<FaLink/>}
                                    isActive={activeSection === 'view'}
                                    onClick={() => setActiveSection('view')}
                                />
                                <NavButton
                                    icon={<FaInfo/>}
                                    isActive={activeSection === 'about'}
                                    onClick={() => setActiveSection('about')}
                                />
                                <NavButton
                                    icon={<FaCog/>}
                                    isActive={showConfigInput}
                                    onClick={() => setShowConfigInput(!showConfigInput)}
                                />
                                <Connector>
                                {currentAccount ? (
                                    <ConnectButton
                                        actionsMenu={{
                                            extraItems: [{
                                                key: '1',
                                                label: 'View My SecretFileLink',
                                                onClick: () => {
                                                    alert("Not Connected or No link found")
                                                }
                                            }]
                                        }}
                                        className={buttonClasses}
                                    />
                                ) : (
                                    <ConnectButton className={buttonClasses}/>
                                )}
                                </Connector>
                            </>
                        )}
                    </div>
                </div>
            </header>
            
            {showConfetti && <Confetti/>}
            
            <motion.div
                initial={{opacity: 1, scale: 0.8}}
                animate={{opacity: 1, scale: 1}}
                transition={{duration: 0.5}}
                className="bg-white rounded-lg shadow-xl p-8 max-w-4xl w-full"
            >
                <AnimatePresence mode="wait">
                    {renderContent()}
                </AnimatePresence>
            </motion.div>
        </div>
    )
}