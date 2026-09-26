import React, { useState, useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';

export function ChatArea({ messages, loading, onSend, sidebarOpen }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = () => {
    const txt = input.trim();
    if (!txt) return;
    setInput('');
    onSend(txt);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Top bar */}
      <div style={{
        padding: '14px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(13,20,36,0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 5,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--success)',
            animation: 'pulse-dot 2s infinite',
            boxShadow: '0 0 8px var(--success)',
          }} />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            Assistant Télécom IA
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          LTE 4G / UMTS 3G · Drive Test Analysis
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips */}
      <div style={{
        padding: '0 24px 10px',
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        overflowX: 'auto',
      }}>
        {SUGGESTIONS.map((s, i) => (
          <button
            key={i}
            onClick={() => onSend(s)}
            style={{
              padding: '5px 14px',
              borderRadius: 20,
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              fontSize: 11,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              fontFamily: 'var(--font-body)',
            }}
            onMouseEnter={e => {
              e.target.style.borderColor = 'var(--accent)';
              e.target.style.color = 'var(--accent)';
              e.target.style.background = 'var(--accent-dim)';
            }}
            onMouseLeave={e => {
              e.target.style.borderColor = 'var(--border)';
              e.target.style.color = 'var(--text-secondary)';
              e.target.style.background = 'var(--bg-card)';
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 24px 20px',
        borderTop: '1px solid var(--border)',
        background: 'rgba(13,20,36,0.8)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-end',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-bright)',
          borderRadius: 14,
          padding: '12px 16px',
          transition: 'border-color 0.2s',
        }}
        onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--accent)'}
        onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border-bright)'}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Posez votre question sur les données télécom... (Entrée pour envoyer)"
            rows={1}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 14,
              resize: 'none',
              lineHeight: 1.5,
              fontFamily: 'var(--font-body)',
              maxHeight: 120,
              overflowY: 'auto',
            }}
            onInput={e => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              background: input.trim() && !loading ? 'var(--accent)' : 'var(--border)',
              color: input.trim() && !loading ? '#000' : 'var(--text-muted)',
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              letterSpacing: '0.05em',
            }}
          >
            ENVOYER →
          </button>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
          ⇧ Maj+Entrée pour nouvelle ligne · Entrée pour envoyer
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: 'var(--accent-dim)',
        border: '1px solid var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14,
      }}>📡</div>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '4px 12px 12px 12px',
        padding: '10px 16px',
        display: 'flex', gap: 4, alignItems: 'center',
      }}>
        {[0, 0.2, 0.4].map((delay, i) => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--accent)',
            animation: `typing 1s ${delay}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  "📊 Distribution RSRP",
  "📈 Graphique RSRQ",
  "🔍 Analyser couverture",
  "⚡ Comparer 3G vs 4G",
  "📄 Rapport complet",
  "🎯 Recommandations réseau",
];
