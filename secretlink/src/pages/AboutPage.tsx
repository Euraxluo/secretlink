import * as React from 'react'
import { FaFileAlt, FaKey, FaLock, FaDatabase, FaLink } from 'react-icons/fa'
import ProcessStep from '../components/ProcessStep'

const AboutPage: React.FC = () => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
            <h3 className="text-xl font-semibold mb-4">How SecretLink Works</h3>
            <div className="space-y-4">
                <ProcessStep
                    icon={<FaFileAlt/>}
                    title="1. Upload Content"
                    description="Upload your file or enter text to be encrypted."
                />
                <ProcessStep
                    icon={<FaKey/>}
                    title="2. Generate Encryption Key"
                    description="A unique encryption key is generated in your browser."
                />
                <ProcessStep
                    icon={<FaLock/>}
                    title="3. Encrypt Data"
                    description="Your content is encrypted using AES encryption."
                />
                <ProcessStep
                    icon={<FaDatabase/>}
                    title="4. Store Encrypted Data"
                    description="Encrypted data is stored in SUI Walrus distributed storage."
                />
                <ProcessStep
                    icon={<FaLink/>}
                    title="5. Generate Shareable Link"
                    description="A unique link is created for accessing the encrypted content."
                />
            </div>
        </div>
    )
}

export default AboutPage 