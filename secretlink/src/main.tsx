import {StrictMode} from 'react'
import {HashRouter, Route, Routes} from "react-router-dom";
import {createRoot} from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <HashRouter>
            <Routes>
                <Route path="/" element={<App/>}/>
            </Routes>
        </HashRouter>
    </StrictMode>,
)
