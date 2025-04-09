import { motion } from 'framer-motion'
import * as React from 'react'

interface ProcessStepProps {
    icon: React.ReactNode
    title: string
    description: string
}

const ProcessStep: React.FC<ProcessStepProps> = ({icon, title, description}) => (
    <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        className="flex items-start space-x-3"
    >
        <div className="flex-shrink-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-indigo-500 text-white">
                {icon}
            </div>
        </div>
        <div>
            <h4 className="text-lg font-medium">{title}</h4>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
    </motion.div>
)

export default ProcessStep 