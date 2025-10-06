// App.tsx (Conteúdo atualizado)

import React, { useEffect, useRef, useState, useCallback } from 'react';
import QrScanner from 'qr-scanner';
import { FaQrcode } from 'react-icons/fa';
import './App.scss';
// Importação dos novos componentes
import { QrScannerView } from './components/QrScannerView';
import { ScannedCodeList } from './components/ScannedCodeList';


// --- Tipos e Interfaces ---

// Interface para representar a instância do QrScanner (ajustada para ser mais robusta)
interface QrScannerInstance extends QrScanner {
    destroy: () => void;
    start: () => Promise<void>;
    stop: () => void;
    setFlash: (on: boolean) => Promise<void>;
}
type ScannedCode = string;

// --- Constantes ---
const STORAGE_KEY = 'qrScannedCodes_v2';
const SCAN_PAUSE_MS = 700; // pausa entre leituras

// --- Componente App.tsx ---
export default function App(): React.ReactElement {
    // --- Refs e Estados ---
    const videoRef = useRef<HTMLVideoElement>(null);
    const scannerRef = useRef<QrScannerInstance | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const acceptedAudioRef = useRef<HTMLAudioElement>(null);
    const deniedAudioRef = useRef<HTMLAudioElement>(null);

    const [codes, setCodes] = useState<ScannedCode[]>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) as ScannedCode[] : [];
        } catch (e) {
            return [];
        }
    });

    const codesRef = useRef<ScannedCode[]>(codes);
    useEffect(() => {
        codesRef.current = codes;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
    }, [codes]);

    const [running, setRunning] = useState<boolean>(false);
    const [status, setStatus] = useState<string>('Pronto');
    const [expanded, setExpanded] = useState<boolean>(false);
    const [flashOn, setFlashOn] = useState<boolean>(false);


    // --- Handlers Auxiliares ---

    const play = useCallback((el: React.RefObject<HTMLAudioElement>): void => {
        try {
            if (el && el.current) {
                el.current.currentTime = 0;
                el.current.play();
            }
        } catch (e) { /* ignore */ }
    }, []);

    const stopStream = useCallback((): void => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => { try { t.stop(); } catch(e){} });
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
    }, []);
    
    const tryEnableTorch = useCallback(async (on: boolean): Promise<void> => {
        if (scannerRef.current && typeof scannerRef.current.setFlash === 'function') {
            return (scannerRef.current.setFlash as (on: boolean) => Promise<void>)(on);
        }

        const s = streamRef.current;
        if (!s) throw new Error('No active stream');
        const videoTrack = s.getVideoTracks()[0];
        if (!videoTrack) throw new Error('No video track');
        
        const capabilities: MediaTrackCapabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        if (!('torch' in capabilities)) throw new Error('Torch not supported by track');
        
        try {
            await videoTrack.applyConstraints({ advanced: [{ torch: !!on }] });
        } catch (e) {
            throw e;
        }
    }, []);


    // --- Handlers de Ação ---

    const stop = useCallback((): void => {
        if (scannerRef.current) {
            try { scannerRef.current.stop(); scannerRef.current.destroy(); } catch (e) {}
            scannerRef.current = null;
        }
        stopStream();
        setRunning(false);
        setFlashOn(false); // Desliga o flash ao parar
        setStatus('Pronto');
    }, [stopStream]);

    const start = useCallback(async (): Promise<void> => {
        if (running) return;
        
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            setStatus('A câmera só funciona em contexto seguro (https) ou em localhost. Abra o app em https ou em http://localhost.');
            return;
        }
        
        setStatus('Solicitando câmera...');

        try {
            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            } catch (e) {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
            }

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                try { await videoRef.current.play(); } catch (err) { console.info('video.play() failed', err); }
            }
        } catch (err) {
            setStatus('Erro ao acessar câmera: ' + (err instanceof Error ? err.message : String(err)));
            return;
        }

        if (scannerRef.current) {
            try { scannerRef.current.destroy(); } catch (e) {}
            scannerRef.current = null;
        }

        if (videoRef.current) {
            scannerRef.current = new QrScanner(videoRef.current, (result: QrScanner.ScanResult) => {
                const code: ScannedCode = result.data;
                if (codesRef.current.includes(code)) {
                    play(deniedAudioRef);
                    setStatus('Código repetido');
                    return;
                }
                
                play(acceptedAudioRef);
                setCodes(prev => [code, ...prev]);
                setStatus('QR lido');

                try { scannerRef.current?.stop(); } catch (e) {}
                setTimeout(() => { 
                    try { 
                        scannerRef.current?.start(); 
                        setStatus('Escaneando...'); 
                    } catch (e){} 
                }, SCAN_PAUSE_MS);
            }, { 
                highlightScanRegion: true, 
                highlightCodeOutline: true, 
                maxScansPerSecond: 2 
            }) as QrScannerInstance;
        }

        try {
            await scannerRef.current?.start();
            setRunning(true);
            setStatus('Escaneando...');
            
            setTimeout(async () => {
                try { await tryEnableTorch(true); setFlashOn(true); } catch (e) { /* ignore */ }
            }, 400);
        } catch (e) {
            setStatus('Falha ao iniciar scanner: ' + (e instanceof Error ? e.message : String(e)));
        }
    }, [running, play, tryEnableTorch]);

    const toggleScanner = useCallback((): void => {
        if (running) stop(); else start();
    }, [running, stop, start]);

    const toggleFlash = useCallback(async (): Promise<void> => {
        if (!scannerRef.current) {
            alert('Scanner não iniciado');
            return;
        }
        try {
            const newState = !flashOn;
            await tryEnableTorch(newState);
            setFlashOn(newState);
        } catch (e) {
            console.warn('Flash não suportado', e);
            alert('Flash não suportado neste dispositivo');
        }
    }, [flashOn, tryEnableTorch]);

    const retryPermissions = useCallback(async (): Promise<void> => {
        setStatus('Tentando permissões...');
        try {
            const s = await navigator.mediaDevices.getUserMedia({ video: true });
            s.getTracks().forEach(t => t.stop());
            setStatus('Permissão concedida. Clique em Ligar câmera.');
        } catch (e) {
            setStatus('Permissão não concedida: ' + (e instanceof Error ? e.message : String(e)));
        }
    }, []);

    const resetAll = useCallback((): void => {
        if (!confirm('Confirma resetar a lista de códigos e zerar a contagem?')) return;
        setCodes([]);
        setStatus('Lista limpa');
    }, []);

    const toggleExpand = useCallback((): void => setExpanded(v => !v), []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current) try { scannerRef.current.destroy(); } catch (e) {}
            stopStream();
        };
    }, [stopStream]);

    // --- Renderização ---
    return (
        <div className="app-container">
            {/* Header */}
            <div className="card header">
                <h1>QR Scanner</h1>
                <p className="sub">Leitura única de QR Codes — sem repetição</p>
            </div>

            {/* Scanner View (Componente Isolado) */}
            <QrScannerView 
                videoRef={videoRef}
                running={running}
                status={status}
                flashOn={flashOn}
                toggleScanner={toggleScanner}
                toggleFlash={toggleFlash}
                retryPermissions={retryPermissions}
            />

            {/* Scanned Codes List (Componente Isolado) */}
            <ScannedCodeList 
                codes={codes}
                expanded={expanded}
                onToggleExpand={toggleExpand}
                onResetAll={resetAll}
            />

            {/* Audio elements (fallback wavs in assets) */}
            <audio ref={acceptedAudioRef} src="/src/assets/audio/beep-accepted.wav" preload="auto" />
            <audio ref={deniedAudioRef} src="/src/assets/audio/beep-denied.wav" preload="auto" />

        </div>
    );
}