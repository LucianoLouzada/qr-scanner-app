import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
// Ícones necessários (requer 'react-icons')
import { FaCamera, FaQrcode } from 'react-icons/fa';
import { AiOutlineReload } from 'react-icons/ai'; 

import "./App.scss";

// Chave para armazenar no LocalStorage
const STORAGE_KEY = 'qrScannedCodes';

// Componente de Ícone para placeholder
const CameraPlaceholderIcon = () => (
    <FaCamera size={48} className="placeholder-icon" />
);

// Constantes para caminhos e volume de áudio
const AUDIO_SUCCESS = '/audio/success.mp3';
const AUDIO_REJECTED = '/audio/rejected.mp3';
const VOLUME = 0.9; // Volume alto (0.0 a 1.0)

// Constantes de Status
const STATUS_INITIAL = 'Aponte a câmera para um QR Code';
const STATUS_SCANNING = 'Mantenha a câmera apontada para um QR Code';
const STATUS_SUCCESS = 'QR Code novo lido com sucesso!';
const STATUS_REJECTED = 'QR Code já foi lido.';


function App() {
    const videoRef = useRef(null);
    const qrScannerRef = useRef(null);

    // 1. Inicializa o estado lendo do LocalStorage
    const [scannedCodes, setScannedCodes] = useState(() => {
        try {
            const savedCodes = localStorage.getItem(STORAGE_KEY);
            // Retorna o array parseado ou um array vazio se não houver nada
            return savedCodes ? JSON.parse(savedCodes) : [];
        } catch (error) {
            console.error("Erro ao carregar dados do LocalStorage:", error);
            return [];
        }
    });

    const [cameraOn, setCameraOn] = useState(false); 
    const [statusMessage, setStatusMessage] = useState(STATUS_INITIAL);
    
    // 2. Efeito para Sincronizar o estado com o LocalStorage
    // Salva a lista toda vez que 'scannedCodes' é atualizado
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(scannedCodes));
        } catch (error) {
            console.error("Erro ao salvar dados no LocalStorage:", error);
        }
    }, [scannedCodes]);

    // Função para tocar o som com volume alto
    const playSound = (audioPath) => {
        const audio = new Audio(audioPath);
        audio.volume = VOLUME;
        audio.play().catch(error => {
             // Ignora erro de autoplay em alguns navegadores, mas registra no console
             console.log("Audio play failed (possible autoplay restriction):", error);
        });
    };

    // Função para iniciar o scanner
    const startScanner = () => {
        if (videoRef.current) {
            videoRef.current.style.display = 'block';
            setStatusMessage(STATUS_SCANNING);

            qrScannerRef.current = new QrScanner(
                videoRef.current,
                (result) => {
                    const code = result.data; 
                    let isNewCode = false;

                    // Atualiza o estado com base no valor anterior
                    setScannedCodes((prev) => {
                        if (!prev.includes(code)) {
                            isNewCode = true; 
                            return [...prev, code];
                        }
                        return prev;
                    });

                    // Lógica para Som e Status
                    if (isNewCode) {
                        playSound(AUDIO_SUCCESS);
                        setStatusMessage(STATUS_SUCCESS);
                    } else {
                        playSound(AUDIO_REJECTED);
                        setStatusMessage(STATUS_REJECTED);
                    }
                    
                    // Reseta a mensagem de status após 3 segundos
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

    // Efeito para ligar/desligar o scanner (executa no montagem e quando cameraOn muda)
    useEffect(() => {
        if (cameraOn) {
            startScanner();
        } else {
            stopScanner();
        }
        // Cleanup: desliga o scanner ao desmontar o componente
        return () => stopScanner();
    }, [cameraOn]);

    const toggleCamera = () => setCameraOn((prev) => !prev);
    
    const resetCount = () => {
        // Limpa o LocalStorage e o estado
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
             console.error("Erro ao limpar dados do LocalStorage:", error);
        }
        setScannedCodes([]);
        // Define o status dependendo se a câmera está ligada ou não
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