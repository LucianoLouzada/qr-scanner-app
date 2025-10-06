import React, { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import { FaCamera, FaQrcode, FaTrashAlt, FaChevronDown, FaChevronUp, FaBolt } from 'react-icons/fa';
import './App.scss';

const STORAGE_KEY = 'qrScannedCodes_v2';
const SCAN_PAUSE_MS = 700; // pausa entre leituras

export default function App() {
    const videoRef = useRef(null);
    const scannerRef = useRef(null);
    const streamRef = useRef(null);

    const [codes, setCodes] = useState(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    });

    const codesRef = useRef(codes);
    useEffect(() => { codesRef.current = codes; localStorage.setItem(STORAGE_KEY, JSON.stringify(codes)); }, [codes]);

    const [running, setRunning] = useState(false);
    const [status, setStatus] = useState('Pronto');
    const [expanded, setExpanded] = useState(false);
        const [flashOn, setFlashOn] = useState(false);

    const acceptedAudioRef = useRef(null);
    const deniedAudioRef = useRef(null);

    // auxiliary: play audio
    const play = (el) => {
        try {
            if (el && el.current) { el.current.currentTime = 0; el.current.play(); }
        } catch (e) { /* ignore */ }
    };

    // stop stream
    const stopStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => { try { t.stop(); } catch(e){} });
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
    };

    // start scanner
    const start = async () => {
        if (running) return;
                            // check secure context: camera access requires https or localhost
                            if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
                                    setStatus('A câmera só funciona em contexto seguro (https) ou em localhost. Abra o app em https ou em http://localhost.');
                                    console.warn('Insecure context, camera will be blocked');
                                    return;
                            }
                            setStatus('Solicitando câmera...');
            console.log('User initiated start()');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                    streamRef.current = stream;
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        try { await videoRef.current.play(); } catch (err) { console.info('video.play() failed', err); }
                    }
        } catch (e) {
            // try user facing as fallback
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                        streamRef.current = stream;
                        if (videoRef.current) {
                            videoRef.current.srcObject = stream;
                            try { await videoRef.current.play(); } catch (err) { console.info('video.play() failed', err); }
                        }
                    } catch (err) {
                        console.error('getUserMedia fallback failed', err);
                        setStatus('Erro ao acessar câmera: ' + (err && err.message ? err.message : err));
                        return;
                    }
        }

        // destroy previous
        if (scannerRef.current) {
            try { scannerRef.current.destroy(); } catch (e) {}
            scannerRef.current = null;
        }

        scannerRef.current = new QrScanner(videoRef.current, result => {
            const code = result.data;
            if (codesRef.current.includes(code)) {
                play(deniedAudioRef);
                setStatus('Código repetido');
                return;
            }
            // novo código
            play(acceptedAudioRef);
            setCodes(prev => [code, ...prev]);
            setStatus('QR lido');

            // pause scanner briefly
            try { scannerRef.current.stop(); } catch (e) {}
            setTimeout(() => { try { scannerRef.current.start(); setStatus('Escaneando...'); } catch (e){} }, SCAN_PAUSE_MS);
        }, { highlightScanRegion: true, highlightCodeOutline: true, maxScansPerSecond: 2 });

                try {
                    console.log('Calling scannerRef.current.start()');
                    await scannerRef.current.start();
                    setRunning(true);
                    setStatus('Escaneando...');
                // try to enable torch if supported and mark state
                        setTimeout(async () => {
                            try { await tryEnableTorch(true); setFlashOn(true); } catch (e) { /* ignore */ }
                        }, 400);
            } catch (e) {
                    console.error('scanner start failed', e);
                    setStatus('Falha ao iniciar scanner: ' + (e && e.message ? e.message : e));
            }
    };

    const stop = () => {
        if (scannerRef.current) {
            try { scannerRef.current.stop(); scannerRef.current.destroy(); } catch (e) {}
            scannerRef.current = null;
        }
        stopStream();
        setRunning(false);
        setStatus('Pronto');
    };

        const toggleFlash = async () => {
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
        };

        // Try to enable torch using scanner API or MediaStreamTrack constraints as fallback
        const tryEnableTorch = async (on) => {
            if (scannerRef.current && typeof scannerRef.current.setFlash === 'function') {
                return scannerRef.current.setFlash(on);
            }

            // Fallback: try to apply constraints on the video track
            const s = streamRef.current;
            if (!s) throw new Error('No active stream');
            const videoTrack = s.getVideoTracks()[0];
            if (!videoTrack) throw new Error('No video track');
            const capabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
            if (!capabilities.torch) throw new Error('Torch not supported by track');
            try {
                await videoTrack.applyConstraints({ advanced: [{ torch: !!on }] });
            } catch (e) {
                throw e;
            }
        };

    const toggle = () => {
        if (running) stop(); else start();
    };

        const retryPermissions = async () => {
            setStatus('Tentando permissões...');
            try {
                const s = await navigator.mediaDevices.getUserMedia({ video: true });
                // immediately stop and release - we only want to ensure permission dialog
                s.getTracks().forEach(t => t.stop());
                setStatus('Permissão concedida. Clique em Ligar câmera.');
            } catch (e) {
                setStatus('Permissão não concedida: ' + (e && e.message ? e.message : e));
            }
        };

    const resetAll = () => {
        if (!confirm('Confirma resetar a lista de códigos e zerar a contagem?')) return;
        setCodes([]);
        setStatus('Lista limpa');
    };

    const toggleExpand = () => setExpanded(v => !v);

    // ensure cleanup on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current) try { scannerRef.current.destroy(); } catch (e) {}
            stopStream();
        };
    }, []);

    return (
        <div className="app-container">
            <div className="card header">
                <h1>QR Scanner</h1>
                <p className="sub">Leitura única de QR Codes — sem repetição</p>
            </div>

            <div className="card scanner">
                <div className="video-wrap">
                    <video ref={videoRef} className="scanner-video" playsInline muted autoPlay></video>
                    {!running && (
                        <div className="placeholder">
                            <FaCamera size={48} />
                            <p>Clique em Ligar câmera para iniciar</p>
                        </div>
                    )}
                </div>

                <div className="controls">
                    <button className="btn primary" onClick={toggle}><FaCamera /> {running ? 'Desligar câmera' : 'Ligar câmera'}</button>
                    <button className="btn danger" onClick={resetAll}><FaTrashAlt /> Resetar</button>
                                <button className={`btn ${flashOn ? 'flash-on' : ''}`} onClick={toggleFlash}><FaBolt /> {flashOn ? 'Flash ligado' : 'Flash'}</button>
                </div>

                <div className="status">
                            <p>{status}</p>
                            {(status && (status.toLowerCase().includes('erro') || status.toLowerCase().includes('falha') || status.toLowerCase().includes('permiss'))) && (
                                <div style={{ marginTop: 8 }}>
                                    <button className="btn" onClick={retryPermissions}>Tentar permissões</button>
                                </div>
                            )}
                </div>
            </div>

            <div className="card list-card">
                <div className="list-header">
                    <h2><FaQrcode /> {codes.length} códigos</h2>
                    <button className="btn small" onClick={toggleExpand}>{expanded ? <><FaChevronUp /> Reduzir</> : <><FaChevronDown /> Expandir</>}</button>
                </div>

                {expanded && (
                    <div className="list-body">
                        {codes.length === 0 ? <p>Nenhum código lido ainda.</p> : (
                            <ul>
                                {codes.map((c, i) => (
                                    <li key={c + i}><span className="code">{c}</span></li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>

            {/* Audio elements (fallback wavs in assets) */}
            <audio ref={acceptedAudioRef} src="/src/assets/audio/beep-accepted.wav" preload="auto" />
            <audio ref={deniedAudioRef} src="/src/assets/audio/beep-denied.wav" preload="auto" />

        </div>
    );
}