import React, { useState, useRef } from 'react';
import axios from 'axios';

export function UploadModal({ onClose, onSuccess, apiBase }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await axios.post(`${apiBase}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onSuccess(res.data.dataset);
    } catch (e) {
      setError(e.response?.data?.detail || 'Erreur lors de l\'upload');
      setUploading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(7,11,20,0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16, padding: 32, width: 460,
        boxShadow: 'var(--shadow)',
        animation: 'fade-in-up 0.2s ease',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              📤 Importer un fichier Drive Test
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Formats acceptés : .xlsx (LTE) · .csv (UMTS)
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: 18, padding: 4,
          }}>✕</button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--accent)' : file ? 'var(--success)' : 'var(--border-bright)'}`,
            borderRadius: 12, padding: '32px 24px',
            textAlign: 'center', cursor: 'pointer',
            background: dragging ? 'var(--accent-dim)' : file ? 'rgba(0,230,118,0.05)' : 'var(--bg-secondary)',
            transition: 'all 0.2s',
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv"
            style={{ display: 'none' }}
            onChange={e => setFile(e.target.files[0])}
          />
          {file ? (
            <>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 14, color: 'var(--success)', fontWeight: 600 }}>{file.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {(file.size / 1024).toFixed(1)} KB · Cliquer pour changer
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📁</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Glissez-déposez votre fichier ici
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                ou cliquez pour parcourir
              </div>
            </>
          )}
        </div>

        {error && (
          <div style={{
            marginTop: 12, padding: '10px 14px',
            background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.3)',
            borderRadius: 8, color: '#ff5252', fontSize: 12,
          }}>
            ❌ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'none',
            color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13,
          }}>
            Annuler
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            style={{
              flex: 2, padding: '10px', borderRadius: 8,
              border: 'none',
              background: file && !uploading ? 'var(--accent)' : 'var(--border)',
              color: file && !uploading ? '#000' : 'var(--text-muted)',
              cursor: file && !uploading ? 'pointer' : 'not-allowed',
              fontWeight: 700, fontSize: 13,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.05em',
            }}
          >
            {uploading ? '⏳ Upload en cours...' : '⬆ IMPORTER'}
          </button>
        </div>
      </div>
    </div>
  );
}
