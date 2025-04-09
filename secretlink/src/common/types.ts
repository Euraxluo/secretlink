import { ReactNode } from 'react'

export type Section = 'home' | 'upload' | 'view' | 'about'

export interface WalrusClientOptions {
    asBlob?: boolean
    contentType?: string
    epoch?: number
    name?: string
} 