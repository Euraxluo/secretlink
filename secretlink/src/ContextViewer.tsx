import {useEffect, useState} from 'react'
import {motion} from 'framer-motion'
import {FaDownload, FaFile, FaFileAlt, FaFileImage, FaFileAudio, FaFileVideo, FaFileCode} from 'react-icons/fa'

export interface SecureContent {
    type: 'text' | 'file'
    content: string | ArrayBuffer
    fileType?: string
    fileName?: string
    timestamp: number
}

interface ContentViewerProps {
    data: SecureContent
}

const ContentViewer: React.FC<ContentViewerProps> = ({data}) => {
    const [objectUrl, setObjectUrl] = useState<string | null>(null)
    const [loadingProgress, setLoadingProgress] = useState(0)

    useEffect(() => {
        if (data.type === 'file' && typeof data.content === 'string') {
            setLoadingProgress(0)
            const binaryString = atob(data.content)
            const bytes = new Uint8Array(binaryString.length)
            const chunkSize = 1024 * 1024 // 1MB chunks
            let processedBytes = 0

            const processChunk = (start: number) => {
                const end = Math.min(start + chunkSize, binaryString.length)
                for (let i = start; i < end; i++) {
                    bytes[i] = binaryString.charCodeAt(i)
                }
                processedBytes += (end - start)
                setLoadingProgress((processedBytes / binaryString.length) * 100)

                if (end < binaryString.length) {
                    setTimeout(() => processChunk(end), 0)
                } else {
                    const blob = new Blob([bytes], {type: data.fileType})
                    const url = URL.createObjectURL(blob)
                    setObjectUrl(url)
                }
            }

            processChunk(0)

            return () => {
                if (objectUrl) URL.revokeObjectURL(objectUrl)
            }
        }
    }, [data])

    const getFileIcon = (fileType: string) => {
        if (fileType.startsWith('image/')) return <FaFileImage/>
        if (fileType.startsWith('audio/')) return <FaFileAudio/>
        if (fileType.startsWith('video/')) return <FaFileVideo/>
        if (fileType.includes('pdf')) return <FaFileAlt/>
        if (fileType.includes('text') || fileType.includes('application/json')) return <FaFileCode/>
        return <FaFile/>
    }

    const handleDownload = () => {
        if (objectUrl) {
            const a = document.createElement('a')
            a.href = objectUrl
            a.download = data.fileName || 'file'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
        }
    }

    const renderContent = () => {
        if (data.type === 'text') {
            return (
                <div className="bg-gray-100 p-4 rounded-md">
                    <pre className="whitespace-pre-wrap break-words">{data.content as string}</pre>
                </div>
            )
        } else if (data.type === 'file' && objectUrl) {
            switch (data.fileType) {
                case 'image/jpeg':
                case 'image/png':
                case 'image/gif':
                    return (
                        <div className="flex justify-center">
                            <img src={objectUrl} alt="Preview" className="max-w-full h-auto rounded-md"/>
                        </div>
                    )
                case 'audio/mpeg':
                case 'audio/wav':
                    return (
                        <audio controls className="w-full">
                            <source src={objectUrl} type={data.fileType}/>
                            Your browser does not support the audio element.
                        </audio>
                    )
                case 'video/mp4':
                    return (
                        <video controls className="w-full">
                            <source src={objectUrl} type={data.fileType}/>
                            Your browser does not support the video element.
                        </video>
                    )
                case 'application/pdf':
                    return (
                        <div className="bg-gray-100 p-4 rounded-md">
                            <p>PDF preview is not available. Please download the file to view its contents.</p>
                        </div>
                    )
                default:
                    return (
                        <div className="bg-gray-100 p-4 rounded-md">
                            <p>Preview not available for this file type. Please download the file to view its
                                contents.</p>
                        </div>
                    )
            }
        } else if (data.type === 'file' && loadingProgress < 100) {
            return (
                <div className="space-y-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                            style={{width: `${loadingProgress}%`}}
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
                            <p>Loading file: {loadingProgress.toFixed(2)}%</p>
                        </div>
                    </div>
                </div>
            )
        }
    }

    return (
        <motion.div
            initial={{opacity: 0, y: 20}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -20}}
            transition={{duration: 0.3}}
            className="space-y-4"
        >
            <div className="bg-white shadow-md rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">
                        {data.type === 'file' ? (
                            <span className="flex items-center">
                {getFileIcon(data.fileType || '')}
                                <span className="ml-2">{data.fileName || 'Unnamed File'}</span>
              </span>
                        ) : (
                            'Text Content'
                        )}
                    </h2>
                    {data.type === 'file' && objectUrl && (
                        <motion.button
                            whileHover={{scale: 1.05}}
                            whileTap={{scale: 0.95}}
                            className="bg-blue-500 text-white py-2 px-4 rounded-md flex items-center space-x-2"
                            onClick={handleDownload}
                        >
                            <FaDownload/>
                            <span>Download</span>
                        </motion.button>
                    )}
                </div>
                {renderContent()}
                <div className="mt-4 text-sm text-gray-500">
                    Decrypted on: {new Date(data.timestamp).toLocaleString()}
                </div>
            </div>
        </motion.div>
    )
}

export default ContentViewer
// import {useEffect, useState} from 'react';
// import {motion} from 'framer-motion';
// import {FaDownload, FaFile, FaFileAlt, FaFileImage, FaFileAudio, FaFileVideo, FaFileCode} from 'react-icons/fa';
//
// interface SecureContent {
//     type: 'text' | 'file';
//     content: string | ArrayBuffer;
//     fileType?: string;
//     fileName?: string;
//     timestamp: number;
// }
//
// interface ContentViewerProps {
//     data: SecureContent;
// }
//
// const ContentViewer: React.FC<ContentViewerProps> = ({data}) => {
//     const [objectUrl, setObjectUrl] = useState<string | null>(null);
//
//     useEffect(() => {
//         if (data.type === 'file' && typeof data.content === 'string') {
//             const binaryString = atob(data.content);
//             const bytes = new Uint8Array(binaryString.length);
//             for (let i = 0; i < binaryString.length; i++) {
//                 bytes[i] = binaryString.charCodeAt(i);
//             }
//             const blob = new Blob([bytes], {type: data.fileType});
//             const url = URL.createObjectURL(blob);
//             setObjectUrl(url);
//
//             return () => {
//                 URL.revokeObjectURL(url);
//             };
//         }
//     }, [data]);
//
//     const getFileIcon = (fileType: string) => {
//         if (fileType.startsWith('image/')) return <FaFileImage/>;
//         if (fileType.startsWith('audio/')) return <FaFileAudio/>;
//         if (fileType.startsWith('video/')) return <FaFileVideo/>;
//         if (fileType.includes('pdf')) return <FaFileAlt/>;
//         if (fileType.includes('text') || fileType.includes('application/json')) return <FaFileCode/>;
//         return <FaFile/>;
//     };
//
//     const handleDownload = () => {
//         if (objectUrl) {
//             const a = document.createElement('a');
//             a.href = objectUrl;
//             a.download = data.fileName || 'file';
//             document.body.appendChild(a);
//             a.click();
//             document.body.removeChild(a);
//         }
//     };
//
//     const renderContent = () => {
//         if (data.type === 'text') {
//             return (
//                 <div className="bg-gray-100 p-4 rounded-md">
//                     <pre className="whitespace-pre-wrap break-words">{data.content as string}</pre>
//                 </div>
//             );
//         } else if (data.type === 'file' && objectUrl) {
//             switch (data.fileType) {
//                 case 'image/jpeg':
//                 case 'image/png':
//                 case 'image/gif':
//                     return (
//                         <div className="flex justify-center">
//                             <img src={objectUrl} alt="Preview" className="max-w-full h-auto rounded-md"/>
//                         </div>
//                     );
//                 case 'audio/mpeg':
//                 case 'audio/wav':
//                     return (
//                         <audio controls className="w-full">
//                             <source src={objectUrl} type={data.fileType}/>
//                             Your browser does not support the audio element.
//                         </audio>
//                     );
//                 case 'video/mp4':
//                     return (
//                         <video controls className="w-full">
//                             <source src={objectUrl} type={data.fileType}/>
//                             Your browser does not support the video element.
//                         </video>
//                     );
//                 case 'application/pdf':
//                     return (
//                         <div className="bg-gray-100 p-4 rounded-md">
//                             <p>PDF preview is not available. Please download the file to view its contents.</p>
//                         </div>
//                     );
//                 default:
//                     return (
//                         <div className="bg-gray-100 p-4 rounded-md">
//                             <p>Preview not available for this file type. Please download the file to view its
//                                 contents.</p>
//                         </div>
//                     );
//             }
//         }
//     };
//
//     return (
//         <motion.div
//             initial={{opacity: 0, y: 20}}
//             animate={{opacity: 1, y: 0}}
//             exit={{opacity: 0, y: -20}}
//             transition={{duration: 0.3}}
//             className="space-y-4"
//         >
//             <div className="bg-white shadow-md rounded-lg p-6">
//                 <div className="flex items-center justify-between mb-4">
//                     <h2 className="text-xl font-semibold">
//                         {data.type === 'file' ? (
//                             <span className="flex items-center">
//                 {getFileIcon(data.fileType || '')}
//                                 <span className="ml-2">{data.fileName || 'Unnamed File'}</span>
//               </span>
//                         ) : (
//                             'Text Content'
//                         )}
//                     </h2>
//                     {data.type === 'file' && (
//                         <motion.button
//                             whileHover={{scale: 1.05}}
//                             whileTap={{scale: 0.95}}
//                             className="bg-blue-500 text-white py-2 px-4 rounded-md flex items-center space-x-2"
//                             onClick={handleDownload}
//                         >
//                             <FaDownload/>
//                             <span>Download</span>
//                         </motion.button>
//                     )}
//                 </div>
//                 {renderContent()}
//                 <div className="mt-4 text-sm text-gray-500">
//                     Decrypted on: {new Date(data.timestamp).toLocaleString()}
//                 </div>
//             </div>
//         </motion.div>
//     );
// };
//
// export default ContentViewer;