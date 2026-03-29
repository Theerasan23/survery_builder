'use client';

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

export default function DashboardRealtimeStats({ initialTotalResponses }) {
    const [totalResponses, setTotalResponses] = useState(initialTotalResponses);
    const [justUpdated, setJustUpdated] = useState(false);

    useEffect(() => {
        // Connect to Socket.io server
        const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');

        socket.on('connect', () => {
            console.log('Connected to real-time analytics server');
        });

        socket.on('new_response', (data) => {
            // Increment total responses live
            setTotalResponses(prev => prev + 1);

            // Visual feedback
            setJustUpdated(true);
            setTimeout(() => setJustUpdated(false), 2000);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    return (
        <p className={`text-4xl font-bold transition-colors duration-500 flex items-center gap-3 ${justUpdated ? 'text-green-500' : 'text-neutral-800 dark:text-white'}`}>
            {totalResponses}
            {justUpdated && (
                <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 rounded-full animate-pulse">
                    New Response!
                </span>
            )}
        </p>
    );
}
