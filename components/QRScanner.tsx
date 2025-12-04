'use client';

import { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import jsQR from 'jsqr';

interface QRScannerProps {
    onScan: (token: string) => void;
    isScanning: boolean;
}

export default function QRScanner({ onScan, isScanning }: QRScannerProps) {
    const webcamRef = useRef<Webcam>(null);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Request camera permission
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(() => setHasPermission(true))
            .catch(() => setHasPermission(false));
    }, []);

    useEffect(() => {
        if (!isScanning || !hasPermission) {
            if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current);
                scanIntervalRef.current = null;
            }
            return;
        }

        // Scan for QR codes every 300ms
        scanIntervalRef.current = setInterval(() => {
            const imageSrc = webcamRef.current?.getScreenshot();
            if (!imageSrc) return;

            const image = new Image();
            image.src = imageSrc;
            image.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                ctx.drawImage(image, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);

                if (code && code.data) {
                    onScan(code.data);
                    if (scanIntervalRef.current) {
                        clearInterval(scanIntervalRef.current);
                        scanIntervalRef.current = null;
                    }
                }
            };
        }, 300);

        return () => {
            if (scanIntervalRef.current) {
                clearInterval(scanIntervalRef.current);
            }
        };
    }, [isScanning, hasPermission, onScan]);

    if (hasPermission === null) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-xl border border-gray-200 h-64">
                <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4" />
                <p className="text-gray-500 font-medium">カメラを準備中...</p>
            </div>
        );
    }

    if (hasPermission === false) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-xl border border-red-100 h-64 text-center">
                <div className="text-4xl mb-4">📷</div>
                <h3 className="text-lg font-bold text-red-800 mb-2">カメラへのアクセスが必要です</h3>
                <p className="text-sm text-red-600 mb-2">QRコードをスキャンするには、カメラの使用を許可してください。</p>
                <p className="text-xs text-red-400">
                    Camera access is required to scan QR codes.
                </p>
            </div>
        );
    }

    return (
        <div className="relative w-full max-w-md mx-auto overflow-hidden rounded-2xl bg-black shadow-lg">
            <div className="relative aspect-square bg-black">
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{
                        facingMode: 'environment',
                        width: 1280,
                        height: 720
                    }}
                    className="absolute inset-0 w-full h-full object-cover"
                />

                {isScanning && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        {/* Scan Frame */}
                        <div className="relative w-64 h-64">
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />

                            {/* Scanning Line Animation */}
                            <div className="absolute left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-[scan_2s_linear_infinite]" />
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white p-4 text-center border-t border-gray-100">
                {isScanning ? (
                    <p className="text-blue-600 font-bold animate-pulse">QRコードをスキャン中...</p>
                ) : (
                    <p className="text-gray-600 font-medium">QRコードをカメラに向けてください</p>
                )}
            </div>
        </div>
    );
}
