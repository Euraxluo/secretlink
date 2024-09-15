import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { WalrusClient } from 'tuskscript'
import { decodeCompositeKey } from './helper/encoding'
import { fromBase58 } from './helper/base58'
import { extractEncryptedData } from './helper/id'
import { decryptUploadedContent } from './helper/encryption'
import { useParams, useSearchParams } from "react-router-dom"

const AGGREGATOR = "https://aggregator-devnet.walrus.space"
const PUBLISHER = "https://publisher-devnet.walrus.space"

const BLOB_ID_LENGTH = 43

export default function AutoDecryptViewer() {
    const [content, setContent] = useState<string | null>(null)
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
                const client = new WalrusClient(AGGREGATOR, PUBLISHER)
                let blobId: string
                let needsDecryption = false

                if (secretlink.length === BLOB_ID_LENGTH) {
                    blobId = secretlink
                } else {
                    needsDecryption = true
                    const { id, encryptionKey } = decodeCompositeKey(secretlink)
                    blobId = extractEncryptedData(fromBase58(id))

                    if (!encryptionKey) {
                        throw new Error('No encryption key found in the secret link')
                    }
                }

                const data: Blob = await client.retrieve(blobId, { asBlob: true })

                if (needsDecryption) {
                    const { id, encryptionKey } = decodeCompositeKey(secretlink)
                    const decrypted = await decryptUploadedContent(data, encryptionKey!)
                    setContent(URL.createObjectURL(new Blob([decrypted.content], { type: decrypted.fileType })))
                } else {
                    const arrayBuffer = await data.arrayBuffer()
                    const decodedMimetype = mimetype ? decodeURIComponent(mimetype) : "application/octet-stream"
                    setContent(URL.createObjectURL(new Blob([arrayBuffer], { type: decodedMimetype })))
                }
            } catch (err) {
                console.error('Content processing failed:', err)
                setError('Failed to process content. Please check your link and try again.')
            }
        }

        processContent()

        return () => {
            if (content) {
                URL.revokeObjectURL(content)
            }
        }
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

    if (!content) {
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
        <iframe
            src={content}
            style={{ width: '100%', height: '100vh', border: 'none' }}
            title="Decrypted Content"
            sandbox="allow-scripts allow-same-origin"
        />
    )
}