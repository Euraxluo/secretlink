import { motion } from 'framer-motion'
import * as React from 'react'

interface NavButtonProps {
    icon: React.ReactElement
    isActive: boolean
    onClick: () => void
}

const NavButton: React.FC<NavButtonProps> = ({icon, isActive, onClick}) => {
    return (
        <motion.button
            whileHover={{scale: 1.1}}
            whileTap={{scale: 0.9}}
            className={`p-2 rounded-full ${isActive ? 'bg-indigo-100' : ''}`}
            onClick={onClick}
        >
            {React.cloneElement(icon, {className: "text-2xl text-indigo-500"})}
        </motion.button>
    )
}

export default NavButton 