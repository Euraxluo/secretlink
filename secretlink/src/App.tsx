import {useState, useEffect, useCallback} from 'react'
import * as React from "react";
import {motion, AnimatePresence} from 'framer-motion'
import {
    FaLock,
    FaUnlock,
    FaUpload,
    FaLink,
    FaUserSecret,
    FaKey,
    FaFileAlt, FaDatabase, FaInfo, FaFile, FaFont, FaCircleNotch, FaShieldAlt, FaCog, FaCheckCircle
} from 'react-icons/fa'
import Confetti from 'react-confetti'
import {
    decryptDemo, decryptUploadedContent,
    encryptAndPrepareForUpload, encryptDemo,
} from "./helper/encryption";
import {fromBase58, toBase58} from "./helper/base58";
import {decodeCompositeKey, encodeCompositeKey} from "./helper/encoding";
import {LATEST_KEY_VERSION} from "./helper/constants";
import {storeEncryptedData, extractEncryptedData} from "./helper/id";
import {WalrusClient} from 'tuskscript'
import ContentViewer, {SecureContent} from "./ContextViewer";

const AGGREGATOR = "https://aggregator-devnet.walrus.space"
// const AGGREGATOR = "http://localhost:31415"
const PUBLISHER = "https://publisher-devnet.walrus.space"
// const PUBLISHER = "http://localhost:31415"
const FeatureCard = ({icon, title, description}) => (
    <motion.div
        whileHover={{scale: 1.05, rotate: 1}}
        className="bg-white p-6 rounded-lg shadow-lg"
    >
        <div className="text-4xl text-indigo-500 mb-4">{icon}</div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
    </motion.div>
)

const FloatingObject = ({children}) => (
    <motion.div
        animate={{
            y: [0, -10, 0],
            rotate: [0, 5, -5, 0],
        }}
        transition={{
            duration: 5,
            repeat: Infinity,
            repeatType: "reverse",
        }}
        className="absolute"
        style={{
            left: `${Math.random() * 80 + 10}%`,
            top: `${Math.random() * 80 + 10}%`,
        }}
    >
        {children}
    </motion.div>
)

interface ProgressIndicatorProps {
    progress: {
        step: number
        message: string
    }
    totalSteps: number
}

interface ProgressIndicatorProps {
    progress: {
        step: number;
        message: string;
    };
    totalSteps: number;
}

function ProgressIndicator({progress, totalSteps}: ProgressIndicatorProps) {
    const percentage = (progress.step / totalSteps) * 100
    const isComplete = percentage === 100

    return (
        <div className="mt-4 space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                    className={`h-2.5 rounded-full transition-all duration-300 ease-in-out ${
                        isComplete ? 'bg-green-600' : 'bg-blue-600'
                    }`}
                    style={{width: `${percentage}%`}}
                ></div>
            </div>
            <div
                className={`border-l-4 p-4 rounded ${
                    isComplete
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'bg-blue-100 border-blue-500 text-blue-700'
                }`}
                role="alert"
            >
                <div className="flex items-center">
                    {isComplete ? (
                        <FaCheckCircle className="h-5 w-5 mr-3 text-green-500"/>
                    ) : (
                        <svg
                            className="animate-spin h-5 w-5 mr-3 text-blue-500"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            ></circle>
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                        </svg>
                    )}
                    <p className="font-bold">
                        {isComplete ? 'Complete' : `Step ${progress.step} of ${totalSteps}`}
                    </p>
                </div>
                <p className="text-sm">{progress.message}</p>
            </div>
        </div>
    )
}

let demoData = [];

export default function App() {
    const [activeSection, setActiveSection] = useState('home')
    const [showConfetti, setShowConfetti] = useState(false)
    const [demoText, setDemoText] = useState('')
    const [encodeText, setEncodeText] = useState('')
    const [isDemoEncrypting, setIsDemoEncrypting] = useState(false)
    const [isDemoDecrypting, setIsDemoDecrypting] = useState(false)

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
    }, [isDemoEncrypting])

    useEffect(() => {
        if (isDemoDecrypting) {
            decryptDemoCallback(encodeText).then(r => {
                setIsDemoDecrypting(false)
            })
        }
    }, [isDemoDecrypting])

    const encryptDemoCallback = useCallback(async (demoText: string) => {
        console.log("encryptCallback demoText", demoText)
        const {encrypted, iv, key} = await encryptDemo(demoText);
        const id = toBase58(storeEncryptedData(demoData.length + ''));
        const compositeKey = encodeCompositeKey(LATEST_KEY_VERSION, id, key);
        demoData = [...demoData, {
            encrypted: toBase58(encrypted),
            iv: toBase58(iv)
        }]
        console.log("encryptCallback compositeKey", compositeKey)
        setEncodeText(compositeKey)
        return compositeKey
    }, []);

    const decryptDemoCallback = useCallback(async (compositeKey: string) => {
        console.log("decryptCallback compositeKey", compositeKey)
        const {id, encryptionKey, version} = decodeCompositeKey(compositeKey);
        const index = extractEncryptedData(fromBase58(id));
        console.log(index)
        try {
            const data = demoData[parseInt(index)]
            const decrypted = await decryptDemo(data.encrypted, encryptionKey, data.iv, version);
            console.log("decryptCallback decrypted", decrypted)
            setDemoText(decrypted)
        } catch (error) {
            console.error("Failed to decrypt:", error);
        }
    }, []);

    const [isUploading, setIsUploading] = useState(false)
    const [isDecrypting, setIsDecrypting] = useState(false)
    const [shareLink, setShareLink] = useState('')
    const [inputType, setInputType] = useState<'file' | 'text'>('text')
    const [inputContent, setInputContent] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [decryptedContent, setDecryptedContent] = useState<SecureContent | null>(null);
    const [contentToEncrypt, setContentToEncrypt] = useState<SecureContent | null>(null);
    const [contentToDecrypt, setContentToDecrypt] = useState<{
        id: string;
        encryptionKey: Uint8Array;
        version: number
    } | null>(null);
    const [encryptionProgress, setEncryptionProgress] = useState({step: 0, message: ''})
    const [decryptionProgress, setDecryptionProgress] = useState({step: 0, message: ''})
    const [showConfigInput, setShowConfigInput] = useState(false)
    const [publishUrl, setPublishUrl] = useState(PUBLISHER)
    useEffect(() => {
        if (window.location.pathname.length > 1) {
            setActiveSection('view')
            setShareLink(window.location.href)
        }
    }, [])

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsUploading(true)
        setEncryptionProgress({step: 1, message: 'Preparing content for encryption...'})
        if (inputType === 'text') {
            setContentToEncrypt({
                type: 'text',
                content: inputContent,
                timestamp: Date.now()
            })
        } else if (file) {
            // 直接使用文件对象，不需要转换为 Base64
            setContentToEncrypt({
                type: 'file',
                content: file, // 直接使用 File 对象，它是 Blob 的一个特殊类型
                fileType: file.type,
                fileName: file.name,
                timestamp: Date.now()
            })
            setEncryptionProgress({step: 1, message: 'File ready for encryption'})
        } else {
            setEncryptionProgress({step: 0, message: 'No content to encrypt'})
            console.error('No input content')
        }
    }
    const handleDecrypt = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsDecrypting(true)
        setDecryptionProgress({step: 1, message: 'Decoding composite key...'})
        try {
            console.info("shareLink", shareLink)
            setContentToDecrypt(decodeCompositeKey(shareLink.substring((window.location.origin + "/").length)))
        } catch (error) {
            console.info('Decryption failed:', error)
            setDecryptionProgress({step: 0, message: 'Decryption failed. Please try again.'})
            setIsDecrypting(false)
        }
    }

    const encryptCallback = useCallback(async () => {
        try {
            console.log("encryptCallback contentToEncrypt", contentToEncrypt)
            setEncryptionProgress({step: 2, message: 'Encrypting content...'})
            const {blob, key} = await encryptAndPrepareForUpload(
                contentToEncrypt,
                (progress, message) => {
                    console.log(`Progress: ${progress.toFixed(2)}% - ${message}`);
                    setEncryptionProgress({
                        step: 3,
                        message: `Encrypting: ${message} (${progress.toFixed(2)}%)`
                    });
                }
            );

            console.log("encryptCallback blob", blob);
            setEncryptionProgress({step: 4, message: 'Storing encrypted blob data...'})
            const client = new WalrusClient(AGGREGATOR, publishUrl)
            const result = await client.store(blob, {contentType: 'text/json'})
            let id = ''
            if ('newlyCreated' in result) {
                id = result.newlyCreated.blobObject.blobId as string
            } else if ('alreadyCertified' in result) {
                id = result.alreadyCertified.blobId as string
            }
            setEncryptionProgress({step: 5, message: 'Generating share link...'})
            const compositeKey = encodeCompositeKey(LATEST_KEY_VERSION, toBase58(storeEncryptedData(id)), key)
            const url = `${window.location.origin}/${compositeKey}`
            setShareLink(url)
            setIsUploading(false)
            setEncryptionProgress({step: 6, message: 'Encryption complete!'})
            navigator.clipboard.writeText(url).then(() => {
                setShowConfetti(true)
                setTimeout(() => setShowConfetti(false), 5000)
            })
        } catch (error) {
            setEncryptionProgress({step: 0, message: 'Encrypting failed!'})
            console.error('Encryption failed:', error);
        }
    }, [contentToEncrypt])

    const decryptCallback = useCallback(async () => {
        try {
            setDecryptionProgress({step: 2, message: 'Extracting encrypted data...'})
            console.log("decryptCallback contentToDecrypt", contentToDecrypt)
            const blobId = extractEncryptedData(fromBase58(contentToDecrypt.id))
            setDecryptionProgress({step: 3, message: 'Retrieving data from storage...'})
            const client = new WalrusClient(AGGREGATOR, publishUrl)
            const data: Blob = await client.retrieve(blobId, {asBlob: true})
            setDecryptionProgress({step: 4, message: 'Decrypting content...'})
            console.log("decryptCallback data", data)
            console.log("decryptCallback contentToDecrypt", contentToDecrypt)
            const decryptedContent = await decryptUploadedContent(
                data,
                contentToDecrypt.encryptionKey,
                (progress, message) => {
                    console.log(`Progress: ${progress.toFixed(2)}% - ${message}`);
                    setDecryptionProgress({
                        step: 2,
                        message: `Decrypting: ${message} (${progress.toFixed(2)}%)`
                    });
                }
            );
            console.log("decryptCallback decryptedContent", decryptedContent)
            setDecryptedContent(decryptedContent);
            setDecryptionProgress({step: 6, message: 'Decryption complete!'})
        } catch (error) {
            setDecryptionProgress({step: 0, message: 'Decryption failed!'})
            console.error('Decryption failed:', error);
        }

    }, [contentToDecrypt])

    useEffect(() => {
        if (contentToEncrypt) {
            encryptCallback()
        }
    }, [contentToEncrypt, encryptCallback])

    useEffect(() => {
        if (contentToDecrypt) {
            decryptCallback()
        }
    }, [contentToDecrypt, encryptCallback])

    const convertIframeUrl = (url: string): string => {
        // Trim whitespace from the input URL
        url = url.trim()

        // Check if the URL is empty or just a protocol
        if (!url || /^https?:\/\/?$/i.test(url)) {
            return url
        }

        try {
            // If the URL doesn't start with http:// or https://, add https://
            if (!/^https?:\/\//i.test(url)) {
                url = 'https://' + url
            }

            const parsedUrl = new URL(url)

            // Check if the URL has a valid domain
            if (!parsedUrl.hostname) {
                return url
            }

            return `${parsedUrl.origin}/#${parsedUrl.pathname}${parsedUrl.search}`
        } catch (error) {
            console.error('Invalid URL:', url)
            return url // Return the original URL if it's invalid
        }
    }
    const iframeCode = `<iframe src="${convertIframeUrl(shareLink)}"></iframe>`

    const ProcessStep = ({icon, title, description}) => (
        <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            className="flex items-start space-x-3"
        >
            <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-indigo-500 text-white">
                    {icon}
                </div>
            </div>
            <div>
                <h4 className="text-lg font-medium">{title}</h4>
                <p className="mt-1 text-sm text-gray-500">{description}</p>
            </div>
        </motion.div>
    )

    const renderHome = () => (
        <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            className="text-center"
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                <FeatureCard
                    icon={<FaUserSecret className="w-6 h-6"/>}
                    title="End-to-End Encryption"
                    description="Your data is encrypted before it leaves your device."
                />
                <FeatureCard
                    icon={<FaLink className="w-6 h-6"/>}
                    title="Immutable Records"
                    description="Sui Blockchain And Walrus Protocol ensures your shared content remains tamper-proof and verifiable."
                />
                <FeatureCard
                    icon={<FaShieldAlt className="w-6 h-6"/>}
                    title="Decentralized Security"
                    description="No single point of failure. Your data is distributed across the network."
                />
            </div>

            <div className="flex-col space-y-4 bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4">Try our encryption demo!</h3>

                <div className="space-y-4 justify-center sm:space-y-0 sm:flex sm:items-center sm:space-x-2">
                    <input
                        type="text"
                        className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Enter some text"
                        value={demoText}
                        onChange={(e) => setDemoText(e.target.value)}
                    />
                    <motion.button
                        whileHover={{scale: 1.05}}
                        whileTap={{scale: 0.95}}
                        className="w-full sm:w-auto mt-2 sm:mt-0 bg-indigo-500 text-white py-2 px-4 rounded-md"
                        onClick={() => {
                            setDemoText(demoText)
                            setIsDemoEncrypting(true)
                        }}
                    >
                        Encrypt
                    </motion.button>
                </div>
                <div className="space-y-4 justify-center sm:space-y-0 sm:flex sm:items-center sm:space-x-2">
                    <input
                        type="text"
                        className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Enter some text"
                        value={encodeText}
                        onChange={(e) => setEncodeText(e.target.value)}
                    />
                    <motion.button
                        whileHover={{scale: 1.05}}
                        whileTap={{scale: 0.95}}
                        className="w-full sm:w-auto mt-2 sm:mt-0 bg-indigo-500 text-white py-2 px-4 rounded-md"
                        onClick={() => {
                            setEncodeText(encodeText)
                            setIsDemoDecrypting(true)
                        }}
                    >
                        Decrypt
                    </motion.button>
                </div>
            </div>
            <motion.button
                whileHover={{scale: 1.05}}
                whileTap={{scale: 0.95}}
                className="bg-indigo-500 text-white py-3 px-6 mt-4 rounded-md text-lg"
                onClick={() => setActiveSection('upload')}
            >
                Get Started
            </motion.button>


            <FloatingObject><FaLock className="text-4xl text-white"/></FloatingObject>
            <FloatingObject><FaUnlock className="text-4xl text-white"/></FloatingObject>
            <FloatingObject><FaUpload className="text-4xl text-white"/></FloatingObject>

            <div className="flex-col space-y-4 bg-white p-6 rounded-lg shadow-lg">
                <div className="aspect-w-16 aspect-h-9">
                    <iframe
                        src={`${window.location.origin}/#/GkotSqUtiXsgrDQCBePP8fexh8Ybxq7MW3ZiD9HtKKsBZx7Vqq71FEUbRSKaxTq8qkDnSjxzkfZkxsQPn79Jp8CtgHTPNzqMAV7akjh54DweaBPSLMDUWusGtgVpvorUtZpvnypSgi5aKeVpAsFogta1djfHxarJj9NHbuhYU3YgSBzTECZorwCKH66bH8FXyFWJ7CByZyhWSWKY4Szdv5Kys9hPjoDyPQYf96nnrEAoLM15fU9abXVpAryE31wqDuXeiBME7wpWxCZLxXN5YJgQLgNuYpqc4u86U2si7DPUuLRKXk3NXUVbxaSmTwPXnftYkSQDF2DwzvheRWqjxcyP5ywBVgperWAL745rMkMTymjHVQxk`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>
            </div>
            <div className="flex-col space-y-4 bg-white p-6 rounded-lg shadow-lg mt-4">
                <div className="text-4xl text-indigo-500 mb-4">Feature for Breaking the Ice Project</div>
                <h3 className="text-xl font-semibold mb-2">We have now developed a feature supports blob ifram
                    embedding</h3>
                <div className="w-full max-w-2xl mx-auto p-4">
                    <div className="w-full rounded-md border overflow-x-auto">
                        <pre className="p-4 text-sm">
                          <code className="text-gray-600 whitespace-pre-wrap break-all">
                            {`<iframe src="${window.location.origin}/#/oBFdZsNSQcQFwcHLaEL5Ar5LdbcB6Qw3qMTpiYKxDEIoBFdZsNSQcQFwcHLaEL5Ar5LdbcB6Qw3qMTpiYKxDEIoBFdZsNSQcQFwcHLaEL5Ar5LdbcB6Qw3qMTpiYKxDEI?mimetype=video/mp4"></iframe>`}
                          </code>
                        </pre>
                    </div>
                </div>
                <div className="aspect-w-16 aspect-h-9">
                    <iframe
                        src={`${window.location.origin}/#/oBFdZsNSQcQFwcHLaEL5Ar5LdbcB6Qw3qMTpiYKxDEI?mimetype=video/mp4`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>
            </div>
        </motion.div>
    )
    const renderAbout = () => (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
            <h3 className="text-xl font-semibold mb-4">How SecretLink Works</h3>
            <div className="space-y-4">
                <ProcessStep
                    icon={<FaFileAlt/>}
                    title="1. Upload Content"
                    description="Upload your file or enter text to be encrypted."
                />
                <ProcessStep
                    icon={<FaKey/>}
                    title="2. Generate Encryption Key"
                    description="A unique encryption key is generated in your browser."
                />
                <ProcessStep
                    icon={<FaLock/>}
                    title="3. Encrypt Data"
                    description="Your content is encrypted using AES encryption."
                />
                <ProcessStep
                    icon={<FaDatabase/>}
                    title="4. Store Encrypted Data"
                    description="Encrypted data is stored in SUI Walrus distributed storage."
                />
                <ProcessStep
                    icon={<FaLink/>}
                    title="5. Generate Shareable Link"
                    description="A unique link is created for accessing the encrypted content."
                />
            </div>
        </div>
    )
    const renderContent = () => {
        switch (activeSection) {
            case 'home':
                return renderHome()
            case 'about':
                return renderAbout()
            case 'upload':
                return renderUpload()
            case 'view':
                return renderView()
        }
    }
    const renderUpload = () => (
        <form onSubmit={handleUpload} className="space-y-4">
            <div className="flex space-x-2 mb-4">
                <button
                    type="button"
                    onClick={() => setInputType('text')}
                    className={`flex-1 py-2 px-4 rounded-md ${inputType === 'text' ? 'bg-indigo-500 text-white' : 'bg-gray-200'}`}
                >
                    <FaFont className="inline mr-2"/> Text
                </button>
                <button
                    type="button"
                    onClick={() => setInputType('file')}
                    className={`flex-1 py-2 px-4 rounded-md ${inputType === 'file' ? 'bg-indigo-500 text-white' : 'bg-gray-200'}`}
                >
                    <FaFile className="inline mr-2"/> File
                </button>
            </div>

            <AnimatePresence mode="wait">
                {inputType === 'text' ? (
                    <motion.div
                        key="text-input"
                        initial={{opacity: 0, y: 20}}
                        animate={{opacity: 1, y: 0}}
                        exit={{opacity: 0, y: -20}}
                        transition={{duration: 0.3}}
                    >
            <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={4}
                placeholder="Enter your secret text here"
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                required
            />
                    </motion.div>
                ) : (
                    <motion.div
                        key="file-input"
                        initial={{opacity: 0, y: 20}}
                        animate={{opacity: 1, y: 0}}
                        exit={{opacity: 0, y: -20}}
                        transition={{duration: 0.3}}
                    >
                        <input
                            type="file"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            required
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                whileHover={{scale: 1.05}}
                whileTap={{scale: 0.95}}
                className="w-full bg-indigo-500 text-white py-2 rounded-md flex items-center justify-center space-x-2"
                type="submit"
                disabled={isUploading}
            >
                {isUploading ? (
                    <motion.div
                        animate={{rotate: 360}}
                        transition={{duration: 1, repeat: Infinity, ease: "linear"}}
                    >
                        <FaCircleNotch className="text-xl"/>
                    </motion.div>
                ) : (
                    <>
                        <FaLock className="text-xl"/>
                        <span>Encrypt & Upload</span>
                    </>
                )}
            </motion.button>

            {isUploading && ProgressIndicator({progress: encryptionProgress, totalSteps: 6})}

            {shareLink && (
                <motion.div
                    initial={{opacity: 0, y: 20}}
                    animate={{opacity: 1, y: 0}}
                    className="mt-6 p-4 bg-green-50 opacity-100 rounded-md"
                >
                    <div className="w-full mx-auto p-4">
                        <p className="text-green-800 font-medium">Your share link:</p>
                        <div className="w-full rounded-md border overflow-x-auto">
                        <pre className="p-4 text-sm">
                          <code className="text-gray-600 whitespace-pre-wrap break-all">
                              {shareLink}
                          </code>
                        </pre>
                        </div>
                    </div>
                    <div className="w-full mx-auto p-4">
                        <p className="text-green-800 font-medium mb-2">Iframe embed code:</p>
                        <div className="w-full rounded-md border overflow-x-auto">
                        <pre className="p-4 text-sm">
                          <code className="text-gray-600 whitespace-pre-wrap break-all">
                            {iframeCode}
                          </code>
                        </pre>
                        </div>
                    </div>
                    <div className="w-full mx-auto p-4">
                        <p className="text-green-800 font-medium mb-2">Preview:</p>
                        <div className="w-full rounded-md border overflow-x-auto">
                            <iframe
                                src={convertIframeUrl(shareLink)}
                                width="100%"
                                height="500"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </form>
    )

    const renderView = () => (
        <motion.div
            key="view"
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -20}}
            transition={{duration: 0.3}}
            className="space-y-4"
        >
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Share Link</label>
                <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Paste your share link here"
                    value={shareLink}
                    onChange={(e) => setShareLink(e.target.value)}
                />
            </div>
            <motion.button
                whileHover={{scale: 1.05}}
                whileTap={{scale: 0.95}}
                className="w-full bg-indigo-500 text-white py-2 rounded-md flex items-center justify-center space-x-2"
                onClick={handleDecrypt}
            >
                <FaUnlock className="text-xl"/>
                <span>Decrypt & View</span>
            </motion.button>
            {isDecrypting && ProgressIndicator({progress: decryptionProgress, totalSteps: 6})}

            {decryptedContent && <ContentViewer data={decryptedContent}/>}
        </motion.div>
    )

    const handleConfigSubmit = (e) => {
        e.preventDefault()
        // Handle the config link submission here
        console.log('Config link submitted:', publishUrl)
        setShowConfigInput(false)
    }
    return (
        <div
            className="h-screen bg-gradient-to-br from-purple-400 to-indigo-600 flex flex-col p-4 items-center">

            <header className="mb-8 bg-white rounded-lg shadow-xl p-4 max-w-4xl w-full">
                <div className="container mx-auto flex justify-between items-center">
                    <div
                        className="text-2xl font-bold flex items-center text-indigo-500 transition-transform duration-200 ease-in-out hover:scale-105 active:scale-95 cursor-pointer"
                        onClick={() => setActiveSection('home')}
                    >
                        <FaUserSecret className="text-2xl text-indigo-500 mr-2"/>
                        SecretLink
                    </div>

                    <div className="flex items-center space-x-4">
                        {showConfigInput ? (
                            <form onSubmit={handleConfigSubmit} className="flex items-center">
                                <input
                                    type="text"
                                    placeholder={publishUrl}
                                    value={publishUrl}
                                    onChange={(e) => setPublishUrl(e.target.value)}
                                    className="mr-2 w-64"
                                />
                                <motion.button
                                    type="submit"
                                    whileHover={{scale: 1.1}}
                                    whileTap={{scale: 0.9}}
                                    className={`p-2 rounded-full  'bg-indigo-100'`}
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

function NavButton({icon, isActive, onClick}) {
    return (
        <motion.button
            whileHover={{scale: 1.1}}
            whileTap={{scale: 0.9}}
            className={`p-2 rounded-full ${isActive ? 'bg-indigo-100' : ''}`}
            onClick={onClick}
        >
            {React.cloneElement(icon, {className: "text-2xl text-indigo-500"})}
        </motion.button>
    )
}