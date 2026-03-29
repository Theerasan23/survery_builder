'use client';

import { motion } from 'framer-motion';

export default function Template({ children }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ 
                ease: "easeInOut", 
                duration: 0.4,
                type: "spring",
                stiffness: 110,
                damping: 20
            }}
        >
            {children}
        </motion.div>
    );
}
