import { motion } from 'framer-motion'
import * as React from 'react'
import { useState } from 'react'
import { FaUnlock } from 'react-icons/fa'
import ProgressIndicator, { ProgressStatus } from '../components/ProgressIndicator'
import ContentViewer, { SecureContent } from '../components/ContextViewer'

interface ViewPageProps {
    shareLink: string
    setShareLink: (link: string) => void
    isDecrypting: boolean
    decryptionProgress: ProgressStatus
    decryptedContent: SecureContent | null
    onDecrypt: (e: React.FormEvent) => Promise<void>
}

const ViewPage: React.FC<ViewPageProps> = ({
    shareLink,
    setShareLink,
    isDecrypting,
    decryptionProgress,
    decryptedContent,
    onDecrypt
}) => {
    return (
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
                onClick={onDecrypt}
            >
                <FaUnlock className="text-xl"/>
                <span>Decrypt & View</span>
            </motion.button>
            
            {isDecrypting && <ProgressIndicator progress={decryptionProgress} totalSteps={6}/>}

            {decryptedContent && <ContentViewer data={decryptedContent}/>}
        </motion.div>
    )
}

export default ViewPage 