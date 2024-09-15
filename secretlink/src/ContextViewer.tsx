import {useEffect, useState} from 'react'
import {motion} from 'framer-motion'
import {
    FaDownload,
    FaFile,
    FaFileImage,
    FaFileAudio,
    FaFileVideo,
    FaFileCode,
    FaFilePdf,
    FaFileWord,
    FaFileExcel,
    FaFilePowerpoint,
    FaFileArchive
} from 'react-icons/fa'

export interface SecureContent {
    type: 'text' | 'file'
    content: string | Blob
    fileType?: string
    fileName?: string
    timestamp: number
}

interface ContentViewerProps {
    data: SecureContent
}

export default function ContentViewer({data}: ContentViewerProps) {
    const [objectUrl, setObjectUrl] = useState<string | null>(null)

    useEffect(() => {
        if (data.type === 'file' && data.content instanceof Blob) {
            const url = URL.createObjectURL(data.content);
            setObjectUrl(url);

            return () => {
                if (url) URL.revokeObjectURL(url);
            };
        }
    }, [data]);

    const getFileIcon = (fileType: string) => {
        if (fileType.startsWith('image/')) return <FaFileImage/>
        if (fileType.startsWith('audio/')) return <FaFileAudio/>
        if (fileType.startsWith('video/')) return <FaFileVideo/>
        if (fileType.includes('pdf')) return <FaFilePdf/>
        if (fileType.includes('word')) return <FaFileWord/>
        if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <FaFileExcel/>
        if (fileType.includes('powerpoint') || fileType.includes('presentation')) return <FaFilePowerpoint/>
        if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) return <FaFileArchive/>
        if (fileType.includes('text') || fileType.includes('application/json') || fileType.includes('javascript') || fileType.includes('css')) return <FaFileCode/>
        return <FaFile/>
    }

    const handleDownload = () => {
        if (data.type === 'file' && data.content instanceof Blob) {
            const url = URL.createObjectURL(data.content);
            const a = document.createElement('a');
            a.href = url;
            a.download = data.fileName || 'file';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else if (data.type === 'text') {
            const blob = new Blob([data.content as string], {type: 'text/plain'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'content.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
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
                case 'image/webp':
                case 'image/svg+xml':
                    return (
                        <div className="flex justify-center">
                            <img src={objectUrl} alt="Preview" className="max-w-full h-auto rounded-md"/>
                        </div>
                    )
                case 'audio/mpeg':
                case 'audio/wav':
                case 'audio/ogg':
                    return (
                        <audio controls className="w-full">
                            <source src={objectUrl} type={data.fileType}/>
                            Your browser does not support the audio element.
                        </audio>
                    )
                case 'video/mp4':
                case 'video/webm':
                case 'video/ogg':
                case 'video/mov':
                case 'video/quicktime':
                    return (
                        <video controls className="w-full">
                            <source src={objectUrl} type={data.fileType}/>
                            Your browser does not support the video element.
                        </video>
                    )
                case 'application/pdf':
                    return (
                        <iframe src={objectUrl} className="w-full h-screen" title="PDF Viewer"></iframe>
                    )
                case 'text/plain':
                case 'text/html':
                case 'text/css':
                case 'application/javascript':
                case 'application/json':
                    return (
                        <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96">
                            <pre className="whitespace-pre-wrap break-words">
                                {data.content instanceof Blob ?
                                    <BlobTextContent blob={data.content}/> :
                                    data.content}
                            </pre>
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
                    <motion.button
                        whileHover={{scale: 1.1}}
                        whileTap={{scale: 0.9}}
                        className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600"
                        onClick={handleDownload}
                    >
                        <FaDownload className="h-4 w-4"/>
                    </motion.button>
                </div>
                {renderContent()}
                <div className="mt-4 text-sm text-gray-500">
                    Decrypted on: {new Date(data.timestamp).toLocaleString()}
                </div>
            </div>
        </motion.div>
    )
}

function BlobTextContent({blob}: { blob: Blob }) {
    const [content, setContent] = useState<string>('');

    useEffect(() => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setContent(e.target?.result as string);
        };
        reader.readAsText(blob);
    }, [blob]);

    return <>{content}</>;
}