import * as React from 'react'
import { useEffect } from 'react'
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
import { SealClient } from'@mysten/seal'

// 组件引入
import NavButton from './components/NavButton'

// 页面引入
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import UploadPage from './pages/UploadPage'
import ViewPage from './pages/ViewPage'

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
        setCustomAggregatorUrl
    } = useEncryption()
    
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