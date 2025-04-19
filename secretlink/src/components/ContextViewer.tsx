import {useEffect, useState} from 'react'
import {motion} from 'framer-motion'
import * as React from 'react'
import ReactMarkdown from 'react-markdown'
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
    content: string | Blob | Uint8Array
    fileType?: string
    fileName?: string
    timestamp: number
}

interface ContentViewerProps {
    data: SecureContent
}

export default function ContentViewer({data}: ContentViewerProps) {
    const [objectUrl, setObjectUrl] = useState<string | null>(null)
    const [content, setContent] = useState<React.ReactNode | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadContent() {
            setLoading(true)
            const result = await renderContent()
            setContent(result)
            setLoading(false)
        }
        loadContent()
    }, [data])

    useEffect(() => {
        if (data.type === 'file' && data.content) {
            let blob: Blob;
            if (data.content instanceof Blob) {
                blob = data.content;
            } else if (data.content instanceof Uint8Array) {
                blob = new Blob([data.content], { type: data.fileType || 'application/octet-stream' });
            } else {
                console.error('不支持的文件内容类型');
                return;
            }
            const url = URL.createObjectURL(blob);
            setObjectUrl(url);
            return () => {
                URL.revokeObjectURL(url);
            };
        }
    }, [data]);

    const getFileIcon = (fileType: string) => {
        if (fileType.startsWith('image/')) return <FaFileImage/>
        if (fileType.startsWith('audio/')) return <FaFileAudio/>
        if (fileType.startsWith('video/')) return <FaFileVideo/>
        if (fileType.includes('pdf')) return <FaFilePdf/>
        if (fileType.includes('msword') || fileType.includes('wordprocessingml') || fileType.includes('doc') || fileType.includes('docx')) return <FaFileWord/>
        if (fileType.includes('spreadsheetml') || fileType.includes('excel') || fileType.includes('xls')) return <FaFileExcel/>
        if (fileType.includes('presentationml') || fileType.includes('powerpoint') || fileType.includes('ppt')) return <FaFilePowerpoint/>
        if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z') || fileType.includes('tar') || fileType.includes('gzip')) return <FaFileArchive/>
        if (fileType.includes('text') || fileType.includes('xml') || fileType.includes('json') || fileType.includes('javascript') || fileType.includes('css') || fileType.includes('html') || fileType.includes('csv') || fileType.includes('markdown') || fileType.includes('md')) return <FaFileCode/>
        return <FaFile/>
    }

    const handleDownload = () => {
        if (data.type === 'file') {
            // 如果内容是 Uint8Array，先转换为 Blob
            const blob = data.content instanceof Uint8Array 
                ? new Blob([data.content], { type: data.fileType }) 
                : data.content as Blob;
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = data.fileName || 'download';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else if (data.type === 'text') {
            const blob = new Blob([data.content as string], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'text.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }

    const getFileTypeFromName = (fileName?: string): string | undefined => {
        if (!fileName) return undefined;
        const ext = fileName.toLowerCase().split('.').pop();
        switch (ext) {
            case 'md':
            case 'markdown':
                return 'text/markdown';
            case 'txt':
                return 'text/plain';
            case 'json':
                return 'application/json';
            case 'pdf':
                return 'application/pdf';
            // 可以根据需要添加更多类型
            default:
                return undefined;
        }
    }

    const renderContent = async () => {
        if (data.type === 'text') {
            return (
                <div className="bg-gray-100 p-4 rounded-md">
                    <pre className="whitespace-pre-wrap break-words">{data.content as string}</pre>
                </div>
            )
        } else if (data.type === 'file') {
            // 如果内容是 Uint8Array，先转换为 Blob
            const blob = data.content instanceof Uint8Array 
                ? new Blob([data.content], { type: data.fileType || 'application/octet-stream' }) 
                : data.content as Blob;
            
            // 优先使用文件名判断的类型
            const effectiveFileType = getFileTypeFromName(data.fileName) || data.fileType || 'application/octet-stream';
            
            // 创建 URL
            if (!objectUrl) {
                const url = URL.createObjectURL(blob);
                setObjectUrl(url);
            }

            if (objectUrl) {
                switch (effectiveFileType) {
                    case 'image/jpeg':
                    case 'image/png':
                    case 'image/gif':
                    case 'image/webp':
                    case 'image/svg+xml':
                    case 'image/bmp':
                    case 'image/tiff':
                        return (
                            <div className="flex justify-center">
                                <img src={objectUrl} alt="Preview" className="max-w-full h-auto rounded-md"/>
                            </div>
                        )
                    case 'audio/mpeg':
                    case 'audio/wav':
                    case 'audio/ogg':
                    case 'audio/aac':
                    case 'audio/flac':
                    case 'audio/m4a':
                        return (
                            <audio controls className="w-full">
                                <source src={objectUrl} type={effectiveFileType}/>
                                Your browser does not support the audio element.
                            </audio>
                        )
                    case 'video/mp4':
                    case 'video/webm':
                    case 'video/ogg':
                    case 'video/mov':
                    case 'video/quicktime':
                    case 'video/x-matroska':
                    case 'video/x-msvideo':
                    case 'video/x-flv':
                        return (
                            <video controls className="w-full">
                                <source src={objectUrl} type={effectiveFileType}/>
                                Your browser does not support the video element.
                            </video>
                        )
                    case 'application/pdf':
                        return (
                            <div className="w-full h-screen">
                                <iframe src={objectUrl} className="w-full h-full" title="PDF Viewer"></iframe>
                            </div>
                        )
                    case 'text/plain':
                    case 'text/html':
                    case 'text/css':
                    case 'text/csv':
                    case 'text/xml':
                    case 'application/javascript':
                    case 'application/json':
                    case 'application/xml':
                    case 'application/x-yaml':
                    case 'text/markdown':
                    case 'text/x-markdown':
                    case 'application/x-markdown':
                    case 'application/octet-stream':
                        // 如果是 markdown 文件，使用 MarkdownBlobContent 渲染
                        if (data.fileName?.toLowerCase().endsWith('.md') || 
                            effectiveFileType.includes('markdown')) {
                            return (
                                <div className="bg-white p-4 rounded-md prose prose-sm max-w-none">
                                    <MarkdownBlobContent blob={blob} />
                                </div>
                            );
                        }
                        
                        // 其他文本文件使用 BlobTextContent 预览
                        return (
                            <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96">
                                <pre className="whitespace-pre-wrap break-words">
                                    <BlobTextContent blob={blob} />
                                </pre>
                            </div>
                        );
                    default:
                        return (
                            <div className="bg-gray-100 p-8 rounded-md flex flex-col items-center justify-center space-y-4">
                                <div className="text-4xl text-gray-400">
                                    {getFileIcon(effectiveFileType || '')}
                                </div>
                                <p className="text-gray-600 text-center">
                                    该文件类型（{effectiveFileType || '未知类型'}）暂不支持预览
                                    <br />
                                    <span className="text-sm">
                                        请点击右上角下载按钮来查看文件内容
                                    </span>
                                </p>
                            </div>
                        )
                }
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
                                {getFileIcon(getFileTypeFromName(data.fileName) || data.fileType || '')}
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
                {loading ? (
                    <div className="flex justify-center items-center p-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                ) : content}
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

function MarkdownBlobContent({blob}: { blob: Blob }) {
    const [content, setContent] = useState<string>('');

    useEffect(() => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setContent(e.target?.result as string);
        };
        reader.readAsText(blob);
    }, [blob]);

    return <ReactMarkdown>{content}</ReactMarkdown>;
}