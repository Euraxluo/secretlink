import {StrictMode} from 'react'
import {HashRouter, Route, Routes} from "react-router-dom";
import {createRoot} from 'react-dom/client'
import App from './App'
import './index.css'
import AutoDecryptViewer from "./auto-decrypt-viewer";

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <HashRouter>
            <Routes>
                <Route path="/" element={<App/>}/>
                <Route path="/:secretlink" element={<AutoDecryptViewer/>}/>
                <Route path="/:secretlink/:mimetype" element={<AutoDecryptViewer/>}/>
            </Routes>
        </HashRouter>
    </StrictMode>,
)
