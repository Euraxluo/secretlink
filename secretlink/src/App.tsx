import {useState, useEffect, useCallback} from 'react'
import {motion, AnimatePresence} from 'framer-motion'
import {
    FaLock,
    FaUnlock,
    FaUpload,
    FaLink,
    FaUserSecret,
    FaKey,
    FaFileAlt, FaDatabase, FaInfo, FaFile, FaFont, FaCircleNotch, FaShieldAlt
} from 'react-icons/fa'
import Confetti from 'react-confetti'
import {decrypt, encrypt} from "./helper/encryption";
import {fromBase58, toBase58} from "./helper/base58";
import {decodeCompositeKey, encodeCompositeKey} from "./helper/encoding";
import {LATEST_KEY_VERSION} from "./helper/constants";
import {storeEncryptedData, extractEncryptedData} from "./helper/id";
import {WalrusClient} from 'tuskscript'
import ContentViewer, {SecureContent} from "./ContextViewer";

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

function ProgressIndicator({progress, totalSteps}: ProgressIndicatorProps) {
    console.log("progress", progress)
    const percentage = (progress.step / totalSteps) * 100

    return (
        <div className="mt-4 space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                    style={{width: `${percentage}%`}}
                ></div>
            </div>
            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded" role="alert">
                <div className="flex items-center">
                    <svg className="animate-spin h-5 w-5 mr-3 text-blue-500" xmlns="http://www.w3.org/2000/svg"
                         fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="font-bold">Step {progress.step} of {totalSteps}</p>
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
        const {encrypted, iv, key} = await encrypt(demoText);

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
            const decrypted = await decrypt(data.encrypted, encryptionKey, data.iv, version);
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
        try {
            if (inputType === 'text') {
                setContentToEncrypt({
                    type: 'text',
                    content: inputContent,
                    timestamp: Date.now()
                })
            } else if (file) {
                const fr = new FileReader()
                fr.readAsArrayBuffer(file)
                fr.addEventListener('load', async (e) => {
                    setContentToEncrypt({
                        type: 'file',
                        content: e.target.result,
                        fileType: file.type,
                        fileName: file.name,
                        timestamp: Date.now()
                    })
                })
            } else {
                throw new Error('No content to encrypt')
            }
        } catch (error) {
            alert('Encryption failed')
            console.error('Encryption failed:', error)
            setIsUploading(false)
        }
    }
    const handleDecrypt = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsDecrypting(true)
        setDecryptionProgress({step: 1, message: 'Decoding composite key...'})
        try {
            console.error("shareLink", shareLink)
            setContentToDecrypt(decodeCompositeKey(shareLink.substring((window.location.origin + "/").length)))
        } catch (error) {
            console.error('Decryption failed:', error)
            setDecryptionProgress({step: 0, message: 'Decryption failed. Please try again.'})
            setIsDecrypting(false)
        }
    }

    const encryptCallback = useCallback(async () => {
        setEncryptionProgress({step: 2, message: 'Encrypting content...'})
        console.log("encryptCallback contentToEncrypt", contentToEncrypt)
        const jsonContent = JSON.stringify(contentToEncrypt)
        const {encrypted, iv, key} = await encrypt(jsonContent)
        setEncryptionProgress({step: 3, message: 'Preparing encrypted data for storage...'})
        const blob = new Blob([JSON.stringify({
            encrypted: toBase58(encrypted),
            iv: toBase58(iv),
        })], {type: 'text/json'})
        const client = new WalrusClient()
        setEncryptionProgress({step: 4, message: 'Storing encrypted data...'})
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
    }, [contentToEncrypt])

    const decryptCallback = useCallback(async () => {
        setDecryptionProgress({step: 2, message: 'Extracting encrypted data...'})
        console.log("decryptCallback contentToDecrypt", contentToDecrypt)
        const blobId = extractEncryptedData(fromBase58(contentToDecrypt.id))
        setDecryptionProgress({step: 3, message: 'Retrieving data from storage...'})
        const client = new WalrusClient()
        const data: any = await client.retrieve(blobId, {asBlob: false})
        setDecryptionProgress({step: 4, message: 'Decrypting content...'})
        const decrypted = await decrypt(data.encrypted, contentToDecrypt.encryptionKey, data.iv, contentToDecrypt.version)
        setDecryptionProgress({step: 5, message: 'Processing decrypted content...'})
        setDecryptedContent(JSON.parse(decrypted))
        setDecryptionProgress({step: 6, message: 'Decryption complete!'})
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
                    description="Blockchain ensures your shared content remains tamper-proof and verifiable."
                />
                <FeatureCard
                    icon={<FaShieldAlt className="w-6 h-6"/>}
                    title="Decentralized Security"
                    description="No single point of failure. Your data is distributed across the network."
                />
            </div>

            <div className="flex-col space-y-1 bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4">Try our encryption demo!</h3>
                <div className="flex items-center justify-center space-x-4">
                    <input
                        type="text"
                        className="px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Enter some text"
                        value={demoText}
                        onChange={(e) => setDemoText(e.target.value)}
                    />
                    <motion.button
                        whileHover={{scale: 1.05}}
                        whileTap={{scale: 0.95}}
                        className="bg-indigo-500 text-white py-2 px-4 rounded-md"
                        onClick={() => {
                            setDemoText(demoText)
                            setIsDemoEncrypting(true)
                        }}
                    >
                        Encrypt
                    </motion.button>
                </div>
                <div className="flex items-center justify-center space-x-4">
                    <input
                        type="text"
                        className="px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Enter some text"
                        value={encodeText}
                        onChange={(e) => setEncodeText(e.target.value)}
                    />
                    <motion.button
                        whileHover={{scale: 1.05}}
                        whileTap={{scale: 0.95}}
                        className="bg-indigo-500 text-white py-2 px-4 rounded-md"
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
                    className="mt-6 p-4 bg-green-100 rounded-md"
                >
                    <p className="text-green-800 font-medium">Your share link:</p>
                    <p className="text-sm break-all">{shareLink}</p>
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
    return (
        <div
            className="h-screen bg-gradient-to-br from-purple-400 to-indigo-600 flex flex-col p-4 items-center">

            <header className="mb-8 bg-white rounded-lg shadow-xl p-4 max-w-4xl w-full">
                <div className="container mx-auto flex justify-end items-center">
                    {/*logo*/}
                    <div
                        className="text-2xl font-bold flex items-center   text-indigo-500 transition-transform duration-200 ease-in-out hover:scale-105 active:scale-95 cursor-pointer"
                        onClick={() => setActiveSection('home')}
                    >
                        <FaUserSecret className="text-2xl text-indigo-500"/>
                        SecretLink
                    </div>

                    <div className="flex-1"></div>
                    <motion.button
                        whileHover={{scale: 1.1}}
                        whileTap={{scale: 0.9}}
                        className={`p-2 rounded-full ${activeSection === 'upload' ? 'bg-indigo-100' : ''}`}
                        onClick={() => setActiveSection('upload')}
                    >
                        <FaUpload className="text-2xl text-indigo-500"/>
                    </motion.button>
                    <motion.button
                        whileHover={{scale: 1.1}}
                        whileTap={{scale: 0.9}}
                        className={`p-2 rounded-full ${activeSection === 'view' ? 'bg-indigo-100' : ''}`}
                        onClick={() => setActiveSection('view')}
                    >
                        <FaLink className="text-2xl text-indigo-500"/>
                    </motion.button>
                    <motion.button
                        whileHover={{scale: 1.1}}
                        whileTap={{scale: 0.9}}
                        className={`p-2 rounded-full ${activeSection === 'about' ? 'bg-indigo-100' : ''}`}
                        onClick={() => setActiveSection('about')}
                    >
                        <FaInfo className="text-2xl text-indigo-500"/>
                    </motion.button>
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