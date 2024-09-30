declare module 'react-qr-code' {
    import { FC } from 'react';

    interface QRCodeProps {
        value: string;
        size?: number;
        bgColor?: string;
        fgColor?: string;
        level?: 'L' | 'M' | 'Q' | 'H';
        includeMargin?: boolean;
    }

    const QRCode: FC<QRCodeProps>;
    export default QRCode;
}
