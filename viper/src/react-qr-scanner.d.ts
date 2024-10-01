declare module 'react-qr-scanner' {
    import React from 'react';

    export interface QrScannerProps {
        delay?: number | false;
        onError: (error: Error) => void;
        onScan: (data: string | null) => void;
        style?: React.CSSProperties;
        facingMode?: 'user' | 'environment';
    }

    export default class QrScanner extends React.Component<QrScannerProps> { }
}