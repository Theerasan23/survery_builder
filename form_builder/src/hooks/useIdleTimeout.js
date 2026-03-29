import { useIdleTimer } from 'react-idle-timer';
import { signOut } from 'next-auth/react';

/**
 * Custom hook to detect user inactivity.
 * @param {number} timeoutMS - Time in milliseconds before auto-logout (default 30 mins)
 */
export const useIdleTimeout = (timeoutMS = 30 * 60 * 1000) => {
    const handleOnIdle = () => {
        console.log('User is idle. Logging out automatically due to inactivity.');
        // Sign out and redirect to login page
        signOut({ callbackUrl: '/login' });
    };

    useIdleTimer({
        timeout: timeoutMS,
        onIdle: handleOnIdle,
        debounce: 500,
        // The events that reset the idle timer
        events: [
            'mousemove',
            'keydown',
            'wheel',
            'DOMMouseScroll',
            'mousewheel',
            'mousedown',
            'touchstart',
            'touchmove',
            'MSPointerDown',
            'MSPointerMove',
            'visibilitychange'
        ]
    });
};
