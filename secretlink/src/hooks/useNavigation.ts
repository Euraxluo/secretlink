import { useState, useEffect } from 'react'
import { WALRUS_PUBLISHER } from '../config/constants'

export interface NavigationCallbacks {
    onPublishUrlChange?: (url: string) => void
}

export const useNavigation = (callbacks?: NavigationCallbacks) => {
    const [activeSection, setActiveSection] = useState('home')
    const [showConfigInput, setShowConfigInput] = useState(false)
    const [publishUrl, setPublishUrl] = useState(WALRUS_PUBLISHER)
    const [showConfetti, setShowConfetti] = useState(false)
    
    // 根据URL路径初始化视图
    useEffect(() => {
        if (window.location.pathname.length > 1) {
            setActiveSection('view')
        }
    }, [])
    
    // 当 publishUrl 改变时调用回调
    useEffect(() => {
        if (callbacks?.onPublishUrlChange) {
            callbacks.onPublishUrlChange(publishUrl)
        }
    }, [publishUrl, callbacks])
    
    // 导航至上传页面
    const navigateToUpload = () => {
        setActiveSection('upload')
    }
    
    // 处理配置提交
    const handleConfigSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        console.log('Config link submitted:', publishUrl)
        setShowConfigInput(false)
    }
    
    // 显示庆祝效果
    const showCelebration = () => {
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 5000)
    }
    
    return {
        activeSection,
        setActiveSection,
        showConfigInput,
        setShowConfigInput,
        publishUrl,
        setPublishUrl,
        showConfetti,
        navigateToUpload,
        handleConfigSubmit,
        showCelebration
    }
} 