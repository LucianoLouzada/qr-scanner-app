// src/components/QrScannerView.tsx

import React from 'react';
import { FaCamera, FaBolt } from 'react-icons/fa';
import { StatusDisplay } from './StatusDisplay'; // Importa o componente StatusDisplay

// Tipagem das Props
interface QrScannerViewProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    running: boolean;
    status: string;
    flashOn: boolean;
    toggleScanner: () => void;
    toggleFlash: () => Promise<void>;
    retryPermissions: () => Promise<void>;
}

export const QrScannerView: React.FC<QrScannerViewProps> = ({
    videoRef,
    running,
    status,
    flashOn,
    toggleScanner,
    toggleFlash,
    retryPermissions,
}) => {
    return (
        <div className="card scanner">
            {/* Área do Vídeo */}
            <div className="video-wrap">
                <video 
                    ref={videoRef} 
                    className="scanner-video" 
                    playsInline 
                    muted 
                    autoPlay
                ></video>
                
                {!running && (
                    <div className="placeholder">
                        <FaCamera size={48} />
                        <p>Clique em Ligar câmera para iniciar</p>
                    </div>
                )}
            </div>

            {/* Controles */}
            <div className="controls">
                <button className="btn primary" onClick={toggleScanner}>
                    <FaCamera /> {running ? 'Desligar câmera' : 'Ligar câmera'}
                </button>
                <button className={`btn ${flashOn ? 'flash-on' : ''}`} onClick={toggleFlash}>
                    <FaBolt /> {flashOn ? 'Flash ligado' : 'Flash'}
                </button>
            </div>

            {/* Status (Componente Isolado) */}
            <StatusDisplay status={status} onRetryPermissions={retryPermissions} />
        </div>
    );
};