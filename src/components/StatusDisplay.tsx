// src/components/StatusDisplay.tsx

import React, { useCallback } from 'react';

// Tipagem das Props
interface StatusDisplayProps {
    status: string;
    onRetryPermissions: () => Promise<void>;
}

export const StatusDisplay: React.FC<StatusDisplayProps> = ({ status, onRetryPermissions }) => {
    // Verifica se a mensagem de status indica um erro ou problema de permissão
    const isError = status && (
        status.toLowerCase().includes('erro') || 
        status.toLowerCase().includes('falha') || 
        status.toLowerCase().includes('permiss')
    );
    
    // Handler para o botão de retentar, usando useCallback para estabilidade
    const handleRetry = useCallback(() => {
        onRetryPermissions();
    }, [onRetryPermissions]);

    return (
        <div className="status">
            <p>{status}</p>
            {isError && (
                <div style={{ marginTop: 8 }}>
                    <button className="btn" onClick={handleRetry}>Tentar permissões</button>
                </div>
            )}
        </div>
    );
};