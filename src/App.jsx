import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { FaCamera, FaQrcode } from 'react-icons/fa';
import { AiOutlineReload } from 'react-icons/ai'; // CORRIGIDO AQUI!

import "./App.scss";

// Chave para armazenar no LocalStorage
const STORAGE_KEY = 'qrScannedCodes';

// Componente de Ícone para placeholder
const CameraPlaceholderIcon = () => (
    <FaCamera size={48} className="placeholder-icon" />
);

// Constantes de Status
const STATUS_INITIAL = 'Aponte a câmera para um QR Code';
const STATUS_SCANNING = 'Mantenha a câmera apontada para um QR Code';
const STATUS_SUCCESS = 'QR Code novo lido com sucesso!';
const STATUS_REJECTED = 'QR Code já foi lido.';

// Variáveis globais para o AudioContext (para ser inicializado no primeiro clique)
let audioContext = null;
let audioUnlocked = false;

// Configurações do Áudio
const VOLUME_MAX = 1.0; // Volume máximo
const SOUND_INTERVAL_MS = 500; // Intervalo de 500ms entre os beeps

// FUNÇÃO PARA GERAR UM BEEP DISTINTO POR SUCESSO/RECUSA (Web Audio API)
const playBeep = (isSuccess) => {
    if (!audioUnlocked) return;
    
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Configurações de som para Sucesso vs Recusa
    if (isSuccess) {
        // **Sucesso:** Rápido, Agudo, e Onda Senoidal (suave)
        oscillator.type = 'sine'; // Onda mais limpa e suave
        oscillator.frequency.setValueAtTime(1500, audioContext.currentTime); // Super agudo
        gainNode.gain.setValueAtTime(VOLUME_MAX, audioContext.currentTime);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.08); // Extremamente rápido (80ms)
    } else {
        // **Recusa:** Lento, Grave, e Onda Quadrada (agressiva)
        oscillator.type = 'square'; // Onda mais "forte"
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime); // Grave
        gainNode.gain.setValueAtTime(VOLUME_MAX, audioContext.currentTime);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3); // Mais longo (300ms)
    }
};


function App() {
    const videoRef = useRef(null);
    const qrScannerRef = useRef(null);

    // Inicializa o estado lendo do LocalStorage (Persistência de Dados)
    const [scannedCodes, setScannedCodes] = useState(() => {
        try {
            const savedCodes = localStorage.getItem(STORAGE_KEY);
            return savedCodes ? JSON.parse(savedCodes) : [];
        } catch (error) {
            console.error("Erro ao carregar dados do LocalStorage:", error);
            return [];
        }
    });

    const [cameraOn, setCameraOn] = useState(false); 
    const [statusMessage, setStatusMessage] = useState(STATUS_INITIAL);
    // Controle do último código aceito para evitar beep duplo
    const lastAcceptedCodeRef = useRef(null);
    const [repeatBlock, setRepeatBlock] = useState(false);
    // **ESTADO PARA O INTERVALO (DEBOUNCE)**
    const [isThrottled, setIsThrottled] = useState(false); 
    
    // Efeito para Sincronizar o estado com o LocalStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(scannedCodes));
        } catch (error) {
            console.error("Erro ao salvar dados no LocalStorage:", error);
        }
    }, [scannedCodes]);
    

    // Função para iniciar o scanner
    const startScanner = () => {
        if (videoRef.current) {
            videoRef.current.style.display = 'block';
            setStatusMessage(STATUS_SCANNING);

            qrScannerRef.current = new QrScanner(
                videoRef.current,
                async (result) => {
                    if (isThrottled) {
                        return;
                    }
                    const code = result.data;
                    // Só registra e bipa se for novo
                    if (!scannedCodes.includes(code)) {
                        setScannedCodes((prev) => {
                            if (!prev.includes(code)) {
                                playBeep(true);
                                setStatusMessage(STATUS_SUCCESS);
                                setIsThrottled(true);
                                // Pausa o scanner por 1s
                                if (qrScannerRef.current) {
                                    qrScannerRef.current.stop();
                                    setTimeout(() => {
                                        if (qrScannerRef.current) {
                                            qrScannerRef.current.start();
                                        }
                                        setIsThrottled(false);
                                    }, 1000);
                                } else {
                                    setTimeout(() => setIsThrottled(false), 1000);
                                }
                                return [...prev, code];
                            }
                            return prev;
                        });
                    } else {
                        // Só bipa negado, não registra
                        playBeep(false);
                        setStatusMessage(STATUS_REJECTED);
                        setIsThrottled(true);
                        setTimeout(() => setIsThrottled(false), SOUND_INTERVAL_MS);
                    }
                    setTimeout(() => {
                        setStatusMessage(STATUS_SCANNING);
                    }, 3000);
                },
                {
                    highlightScanRegion: true,
                    highlightCodeOutline: true,
                    preferredCamera: "environment",
                    maxScansPerSecond: 1, 
                }
            );
            qrScannerRef.current.start();
        }
    };

    // Função para parar o scanner
    const stopScanner = () => {
        if (qrScannerRef.current) {
            qrScannerRef.current.stop();
            qrScannerRef.current.destroy();
            qrScannerRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.style.display = 'none';
        }
        setStatusMessage(STATUS_INITIAL);
    };

    // Efeito para ligar/desligar o scanner
    useEffect(() => {
        if (cameraOn) {
            startScanner();
        } else {
            stopScanner();
        }
        return () => stopScanner();
    }, [cameraOn]);

    const toggleCamera = async () => {
        // Tenta liberar o AudioContext no primeiro clique
        if (!audioUnlocked) {
             if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            audioUnlocked = true;
        }

        setCameraOn((prev) => !prev);
    };
    
    const resetCount = () => {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
             console.error("Erro ao limpar dados do LocalStorage:", error);
        }
        setScannedCodes([]);
        setStatusMessage(cameraOn ? STATUS_SCANNING : STATUS_INITIAL);
    };

    return (
        <div className="app-container">
            {/* CARD 1: Título */}
            <div className="card app-header">
                <h1>Scanner QR Code</h1>
                <p>Escaneie QR codes únicos com sua câmera</p>
            </div>

            {/* CARD 2: Scanner / Placeholder */}
            <div className="card scanner-card">
                <div className="qr-section">
                    <video ref={videoRef} className="scanner-video" muted playsInline></video>

                    {/* Placeholder visível quando a câmera está desligada */}
                    {!cameraOn && (
                        <div className="camera-placeholder">
                            <CameraPlaceholderIcon />
                            <p>Clique no botão para iniciar</p>
                        </div>
                    )}

                    {/* Botão flutuante */}
                    <button
                        className="btn-toggle-camera"
                        onClick={toggleCamera}
                        aria-label={cameraOn ? "Desligar Scanner" : "Ligar Scanner"}
                    >
                        <FaCamera size={20} />
                    </button>
                </div>
            </div>

            {/* CARD 3: Resultados */}
            <div className="card results-card">
                <div className="result">
                    <h2>Total de QR Codes: {scannedCodes.length}</h2>
                    <button className="status-tag" disabled>
                        <FaQrcode size={14} style={{ marginRight: '5px' }} /> Códigos únicos escaneados
                    </button>
                    
                    {/* Exibe o status dinâmico com classes para cores */}
                    <p className={`scan-status ${statusMessage === STATUS_SUCCESS ? 'status-success' : statusMessage === STATUS_REJECTED ? 'status-rejected' : ''}`}>
                        {cameraOn ? statusMessage : STATUS_INITIAL}
                    </p>
                </div>
            </div>

            {/* CARD 4: Resetar */}
            <div className="card reset-card">
                <button className="reset-btn" onClick={resetCount}>
                    <AiOutlineReload size={18} style={{ marginRight: '8px' }} /> Resetar Contador
                </button>
            </div>
            
            {/* Área Opcional: Lista de códigos escaneados */}
            {scannedCodes.length > 0 && (
                <div className="card scanned-list">
                    <h3>Códigos Lidos (Persistentes):</h3>
                    <ul>
                        {scannedCodes.map((code, index) => (
                            <li key={index}>{code}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default App;