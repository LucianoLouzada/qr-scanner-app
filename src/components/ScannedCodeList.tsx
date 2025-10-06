// src/components/ScannedCodeList.tsx

import React from 'react';
import { FaQrcode, FaTrashAlt, FaChevronDown, FaChevronUp } from 'react-icons/fa';

// Tipagem das Props
interface ScannedCodeListProps {
    codes: string[];
    expanded: boolean;
    onToggleExpand: () => void;
    onResetAll: () => void;
}

export const ScannedCodeList: React.FC<ScannedCodeListProps> = ({
    codes,
    expanded,
    onToggleExpand,
    onResetAll,
}) => {
    return (
        <div className="card list-card">
            <div className="list-header">
                <h2><FaQrcode /> {codes.length} códigos</h2>
                <button className="btn danger small" onClick={onResetAll}>
                    <FaTrashAlt /> Resetar
                </button>
                <button className="btn small" onClick={onToggleExpand}>
                    {expanded ? <><FaChevronUp /> Reduzir</> : <><FaChevronDown /> Expandir</>}
                </button>
            </div>

            {expanded && (
                <div className="list-body">
                    {codes.length === 0 ? <p>Nenhum código lido ainda.</p> : (
                        <ul>
                            {codes.map((c, i) => (
                                // Usamos o índice (i) no key como fallback, mas c+i é mais seguro se o código QR for o mesmo
                                <li key={c + i}><span className="code">{c}</span></li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};