import { motion } from 'framer-motion'
import * as React from 'react'

interface FeatureCardProps {
    icon: React.ReactNode
    title: string
    description: string
}

const FeatureCard: React.FC<FeatureCardProps> = ({icon, title, description}) => (
    <motion.div
        whileHover={{scale: 1.05, rotate: 1}}
        className="bg-white p-6 rounded-lg shadow-lg"
    >
        <div className="text-4xl text-indigo-500 mb-4">{icon}</div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
    </motion.div>
)

export default FeatureCard 