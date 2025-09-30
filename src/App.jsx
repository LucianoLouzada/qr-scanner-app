import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { FaCamera, FaQrcode } from 'react-icons/fa';
import { AiOutlineReload } from 'react-icons/ai'; 

import "./App.scss";

// Chave para armazenar no LocalStorage
const STORAGE_KEY = 'qrScannedCodes';

// Componente de Ícone para placeholder
const CameraPlaceholderIcon = () => (
    <FaCamera size={48} className="placeholder-icon" />
);

// ALTERNATIVA DE ÁUDIO (MANTIDA COMENTADA PARA ESTABILIDADE)
/*
const AUDIO_SUCCESS = '/audio/success.mp3';
const AUDIO_REJECTED = '/audio/rejected.mp3';
const VOLUME = 0.9;
const successAudio = new Audio(AUDIO_SUCCESS);
successAudio.volume = VOLUME;
const rejectedAudio = new Audio(AUDIO_REJECTED);
rejectedAudio.volume = VOLUME;
*/

// Constantes de Status
const STATUS_INITIAL = 'Aponte a câmera para um QR Code';
const STATUS_SCANNING = 'Mantenha a câmera apontada para um QR Code';
const STATUS_SUCCESS = 'QR Code novo lido com sucesso!';
const STATUS_REJECTED = 'QR Code já foi lido.';


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
    // const [audioUnlocked, setAudioUnlocked] = useState(false); // REMOVIDO PARA ESTABILIDADE
    
    // Efeito para Sincronizar o estado com o LocalStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(scannedCodes));
        } catch (error) {
            console.error("Erro ao salvar dados no LocalStorage:", error);
        }
    }, [scannedCodes]);
    
    
    // FUNÇÃO DE ÁUDIO (COMENTADA)
    /*
    const playSound = (isSuccess) => {
        // if (audioUnlocked) { // DESCOMENTE SE audioUnlocked FOR USADO
            const audio = isSuccess ? successAudio : rejectedAudio;
            audio.pause();
            audio.currentTime = 0; 
            audio.play().catch(error => {
                 console.log("Audio play failed (possible restriction):", error);
            });
        // }
    };
    */

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

                    setScannedCodes((prev) => {
                        if (!prev.includes(code)) {
                            isNewCode = true; 
                            return [...prev, code];
                        }
                        return prev;
                    });

                    // Lógica para Status (Som Removido)
                    if (isNewCode) {
                        // playSound(true); // DESCOMENTE PARA ATIVAR O SOM
                        setStatusMessage(STATUS_SUCCESS);
                    } else {
                        // playSound(false); // DESCOMENTE PARA ATIVAR O SOM
                        setStatusMessage(STATUS_REJECTED);
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
        // LÓGICA DE DESBLOQUEIO DE ÁUDIO (COMENTADA)
        /*
        if (!audioUnlocked) {
            try {
                // Tenta tocar o som de sucesso com volume zero para liberar o áudio.
                successAudio.volume = 0;
                await successAudio.play();
                successAudio.pause();
                successAudio.currentTime = 0;
                successAudio.volume = VOLUME; // Retorna ao volume normal para leituras futuras
                
                setAudioUnlocked(true);
            } catch (error) {
                 setAudioUnlocked(true);
            }
        }
        */
        
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