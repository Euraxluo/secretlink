import React from 'react'
import {StrictMode} from 'react'
import {HashRouter, Route, Routes} from "react-router-dom";
import {createRoot} from 'react-dom/client'
import App from './App'
import './index.css'
import AutoDecryptViewer from "./components/auto-decrypt-viewer";
import {Suiet, SuiWeb3ConfigProvider} from '@ant-design/web3-sui';
import {networkConfig, useNetworkVariable} from "./config/networkConfig";
import {NETWORK} from "./config/constants";
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';

const queryClient = new QueryClient();

const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
});

// 修复 document.getElementById('root') 可能为 null 的问题
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('找不到根元素');

createRoot(rootElement).render(
    <StrictMode>
        <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
            <SuiWeb3ConfigProvider
                wallets={[Suiet()]}
                networkConfig={networkConfig}
                sns={true}
                autoConnect={true}
                defaultNetwork={NETWORK}
            >
                <HashRouter>
                    <Routes>
                        <Route path="/" element={<App/>}/>
                        <Route path="/:secretlink" element={<AutoDecryptViewer/>}/>
                        <Route path="/:secretlink/:mimetype" element={<AutoDecryptViewer/>}/>
                    </Routes>
                </HashRouter>
            </SuiWeb3ConfigProvider>
        </PersistQueryClientProvider>
    </StrictMode>,
)
