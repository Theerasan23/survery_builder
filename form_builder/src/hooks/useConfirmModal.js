'use client';

import { useState, useCallback } from 'react';

export default function useConfirmModal() {
    const [state, setState] = useState({ open: false, resolve: null, props: {} });

    const confirm = useCallback((props = {}) => {
        return new Promise((resolve) => {
            setState({ open: true, resolve, props });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        state.resolve?.(true);
        setState({ open: false, resolve: null, props: {} });
    }, [state.resolve]);

    const handleCancel = useCallback(() => {
        state.resolve?.(false);
        setState({ open: false, resolve: null, props: {} });
    }, [state.resolve]);

    const modalProps = {
        ...state.props,
        open: state.open,
        onConfirm: handleConfirm,
        onCancel: handleCancel,
    };

    return { confirm, modalProps };
}
