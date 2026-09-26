import React from 'react';

const TECH_COLORS = {
  LTE: { bg: 'rgba(0,212,255,0.1)', border: 'rgba(0,212,255,0.4)', text: '#00d4ff' },
  UMTS: { bg: 'rgba(124,77,255,0.1)', border: 'rgba(124,77,255,0.4)', text: '#7c4dff' },
};

const KPI_UNITS = {
  'RSRP': 'dBm', 'RSRQ': 'dB', 'Throughput (Mbps)': 'Mbps',
  'RSCP': 'dBm', 'Ec/N0': 'dB',
};

export function Sidebar({ datasets, selectedDatasets, onToggleDataset, onUpload, onReport, isOpen, onToggle }) {
  return (
    <aside style={{
      width: isOpen ? 280 : 60,
      minWidth: isOpen ? 280 : 60,
      height: '100vh',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.3s ease, min-width 0.3s ease',
      overflow: 'hidden',
      position: 'relative',
      zIndex: 10,
    }}>
      {/* Header */}
      <div style={{
        padding: isOpen ? '20px 20px 16px' : '20px 12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        justifyContent: isOpen ? 'space-between' : 'center',
      }}>
        {isOpen && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SignalIcon />
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--accent)',
                letterSpacing: '0.08em',
              }}>TELECOM AI</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Drive Test Analyzer
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          style={{
            background: 'none', border: '1px solid var(--border)',
            borderRadius: 8, padding: '6px 8px',
            color: 'var(--text-secondary)', cursor: 'pointer',
            fontSize: 16, display: 'flex', alignItems: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-secondary)'; }}
        >
          {isOpen ? '◀' : '▶'}
        </button>
      </div>

      {isOpen && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>
          {/* Datasets section */}
          <SectionLabel>Datasets ({datasets.length})</SectionLabel>

          {datasets.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '8px 0' }}>
              Chargement...
            </div>
          ) : (
            datasets.map(ds => {
              const isSelected = selectedDatasets.includes(ds.name);
              const tc = TECH_COLORS[ds.tech] || TECH_COLORS.LTE;
              return (
                <div
                  key={ds.name}
                  onClick={() => onToggleDataset(ds.name)}
                  style={{
                    marginBottom: 8,
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: `1px solid ${isSelected ? tc.border : 'var(--border)'}`,
                    background: isSelected ? tc.bg : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: isSelected ? tc.text : 'var(--text-secondary)' }}>
                      {ds.name}
                    </span>
                    <span style={{
                      fontSize: 10, padding: '2px 7px', borderRadius: 20,
                      background: tc.bg, border: `1px solid ${tc.border}`,
                      color: tc.text, fontFamily: 'var(--font-mono)',
                    }}>
                      {ds.tech}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                    {ds.rows.toLocaleString()} mesures
                  </div>
                  {/* KPI mini-stats */}
                  {ds.kpis?.slice(0, 2).map(kpi => (
                    <div key={kpi.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{kpi.name}</span>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: isSelected ? tc.text : 'var(--text-secondary)' }}>
                        ∅ {kpi.mean} {KPI_UNITS[kpi.name] || ''}
                      </span>
                    </div>
                  ))}
                  {/* Checkbox */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: 4,
                      border: `2px solid ${isSelected ? tc.text : 'var(--border-bright)'}`,
                      background: isSelected ? tc.text : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, color: '#000',
                    }}>
                      {isSelected ? '✓' : ''}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {isSelected ? 'Sélectionné' : 'Cliquer pour sélectionner'}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {/* Quick questions */}
          <SectionLabel style={{ marginTop: 16 }}>Questions rapides</SectionLabel>
          {QUICK_QUESTIONS.map((q, i) => (
            <QuickQuestion key={i} text={q} />
          ))}
        </div>
      )}

      {/* Footer buttons */}
      <div style={{
        padding: isOpen ? 16 : '16px 8px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <SidebarBtn icon="⬆" label="Upload fichier" onClick={onUpload} isOpen={isOpen} />
        <SidebarBtn icon="📄" label="Rapport complet" onClick={onReport} isOpen={isOpen} accent />
      </div>
    </aside>
  );
}

function SectionLabel({ children, style }) {
  return (
    <div style={{
      fontSize: 10, fontFamily: 'var(--font-mono)',
      color: 'var(--text-muted)', letterSpacing: '0.12em',
      textTransform: 'uppercase', marginBottom: 10,
      ...style
    }}>
      {children}
    </div>
  );
}

function QuickQuestion({ text }) {
  return (
    <div style={{
      fontSize: 11, color: 'var(--text-secondary)',
      padding: '5px 0',
      borderBottom: '1px solid var(--border)',
      cursor: 'default',
      lineHeight: 1.4,
    }}>
      ↗ {text}
    </div>
  );
}

function SidebarBtn({ icon, label, onClick, isOpen, accent }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', border: `1px solid ${accent ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 8, padding: isOpen ? '9px 14px' : '9px 0',
        background: hover ? (accent ? 'var(--accent-dim)' : 'var(--bg-card)') : 'transparent',
        color: accent ? 'var(--accent)' : 'var(--text-secondary)',
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: isOpen ? 'flex-start' : 'center',
        gap: 8, fontSize: 12, fontWeight: 500,
        transition: 'all 0.2s',
      }}
    >
      <span>{icon}</span>
      {isOpen && <span>{label}</span>}
    </button>
  );
}

function SignalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="16" width="3" height="6" rx="1" fill="var(--accent)" opacity="0.4"/>
      <rect x="7" y="12" width="3" height="10" rx="1" fill="var(--accent)" opacity="0.6"/>
      <rect x="12" y="8" width="3" height="14" rx="1" fill="var(--accent)" opacity="0.8"/>
      <rect x="17" y="3" width="3" height="19" rx="1" fill="var(--accent)"/>
    </svg>
  );
}

const QUICK_QUESTIONS = [
  "Qualité RSRP du dataset LTE ?",
  "Distribution RSRQ en graphique",
  "Comparer 3G et 4G",
  "Zones de mauvaise couverture ?",
  "Rapport avec recommandations",
];
