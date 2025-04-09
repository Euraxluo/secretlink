import { motion } from 'framer-motion'
import * as React from 'react'

interface FloatingObjectProps {
    children: React.ReactNode
}

const FloatingObject: React.FC<FloatingObjectProps> = ({children}) => (
    <motion.div
        animate={{
            y: [0, -10, 0],
            rotate: [0, 5, -5, 0],
        }}
        transition={{
            duration: 5,
            repeat: Infinity,
            repeatType: "reverse",
        }}
        className="absolute"
        style={{
            left: `${Math.random() * 80 + 10}%`,
            top: `${Math.random() * 80 + 10}%`,
        }}
    >
        {children}
    </motion.div>
)

export default FloatingObject 