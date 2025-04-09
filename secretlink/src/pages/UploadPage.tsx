import { motion, AnimatePresence } from 'framer-motion'
import * as React from 'react'
import { useState } from 'react'
import { FaLock, FaCircleNotch, FaFont, FaFile } from 'react-icons/fa'
import ProgressIndicator, { ProgressStatus } from '../components/ProgressIndicator'
import { SecureContent } from '../components/ContextViewer'

interface UploadPageProps {
    isUploading: boolean
    encryptionProgress: ProgressStatus
    shareLink: string
    onUpload: (content: SecureContent) => Promise<void>
}

const UploadPage: React.FC<UploadPageProps> = ({
    isUploading,
    encryptionProgress,
    shareLink,
    onUpload
}) => {
    const [inputType, setInputType] = useState<'file' | 'text'>('text')
    const [inputContent, setInputContent] = useState('')
    const [file, setFile] = useState<File | null>(null)

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (inputType === 'text') {
            await onUpload({
                type: 'text',
                content: inputContent,
                timestamp: Date.now()
            })
        } else if (file) {
            await onUpload({
                type: 'file',
                content: file,
                fileType: file.type,
                fileName: file.name,
                timestamp: Date.now()
            })
        } else {
            console.error('No input content')
        }
    }

    const convertIframeUrl = (url: string): string => {
        url = url.trim()
        if (!url || /^https?:\/\/?$/i.test(url)) {
            return url
        }
        try {
            if (!/^https?:\/\//i.test(url)) {
                url = 'https://' + url
            }
            const parsedUrl = new URL(url)
            if (!parsedUrl.hostname) {
                return url
            }
            return `${parsedUrl.origin}/#${parsedUrl.pathname}${parsedUrl.search}`
        } catch (error) {
            console.error('Invalid URL:', url)
            return url
        }
    }
    
    const iframeCode = `<iframe src="${convertIframeUrl(shareLink)}"></iframe>`

    return (
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

            {isUploading && <ProgressIndicator progress={encryptionProgress} totalSteps={6}/>}

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
}

export default UploadPage 