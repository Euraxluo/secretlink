import { motion } from 'framer-motion'
import * as React from 'react'
import { FaLock, FaUnlock, FaUpload, FaUserSecret, FaLink, FaShieldAlt } from 'react-icons/fa'
import FeatureCard from '../components/FeatureCard'
import FloatingObject from '../components/FloatingObject'
import { useState } from 'react'

interface HomePageProps {
    onStart: () => void
    demoText: string
    encodeText: string
    setDemoText: (text: string) => void
    setEncodeText: (text: string) => void
    onEncrypt: () => void
    onDecrypt: () => void
}

const HomePage: React.FC<HomePageProps> = ({
    onStart,
    demoText,
    encodeText,
    setDemoText,
    setEncodeText,
    onEncrypt,
    onDecrypt
}) => {
    return (
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
                        onClick={onEncrypt}
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
                        onClick={onDecrypt}
                    >
                        Decrypt
                    </motion.button>
                </div>
            </div>
            
            <motion.button
                whileHover={{scale: 1.05}}
                whileTap={{scale: 0.95}}
                className="bg-indigo-500 text-white py-3 px-6 mt-4 rounded-md text-lg"
                onClick={onStart}
            >
                Get Started
            </motion.button>

            <FloatingObject><FaLock className="text-4xl text-white"/></FloatingObject>
            <FloatingObject><FaUnlock className="text-4xl text-white"/></FloatingObject>
            <FloatingObject><FaUpload className="text-4xl text-white"/></FloatingObject>
        </motion.div>
    )
}

export default HomePage 