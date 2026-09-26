import React from 'react';

const PRIORITY_COLORS = {
  'Haute': '#ff5252',
  'Moyenne': '#ffab00',
  'Basse': '#00e676',
};

export function ReportModal({ report, onClose }) {
  const handlePrint = () => window.print();

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(7,11,20,0.9)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16, width: '100%', maxWidth: 760,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: 'var(--shadow), var(--shadow-accent)',
        animation: 'fade-in-up 0.25s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 28px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 2,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
              📋 RAPPORT D'ANALYSE RÉSEAU
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {report.global_summary}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handlePrint} style={{
              padding: '7px 14px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'none',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12,
            }}>🖨 Imprimer</button>
            <button onClick={onClose} style={{
              padding: '7px 14px', borderRadius: 8,
              border: 'none', background: 'var(--accent)',
              color: '#000', cursor: 'pointer', fontSize: 12, fontWeight: 700,
            }}>Fermer ✕</button>
          </div>
        </div>

        <div style={{ padding: '24px 28px' }}>
          {/* Per-dataset sections */}
          {report.datasets?.map((ds, i) => (
            <div key={i} style={{ marginBottom: 28 }}>
              <SectionTitle>
                📡 {ds.name} — {ds.tech}
              </SectionTitle>

              {/* Stats grid */}
              {ds.stats && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: 10, marginBottom: 16,
                }}>
                  {Object.entries(ds.stats).filter(([k]) =>
                    !['name', 'tech', 'total_samples'].includes(k)
                  ).map(([kpi, s]) => (
                    <StatCard key={kpi} kpi={kpi} s={s} />
                  ))}
                </div>
              )}

              {/* Distributions */}
              {ds.distributions && Object.entries(ds.distributions).map(([kpi, items]) => (
                <div key={kpi} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6 }}>
                    Distribution {kpi}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {items.map((item, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 100, fontSize: 12, color: 'var(--text-secondary)' }}>
                          {item.level}
                        </div>
                        <div style={{ width: 180 }}>
                          <div style={{
                            height: 6, borderRadius: 3,
                            background: 'var(--border)',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%', borderRadius: 3,
                              background: item.color,
                              width: `${item.percent}%`,
                              transition: 'width 0.8s ease',
                            }} />
                          </div>
                        </div>
                        <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', width: 50, textAlign: 'right' }}>
                          {item.percent}%
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', width: 60, textAlign: 'right' }}>
                          ({item.count})
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Issues */}
              {ds.issues?.length > 0 && (
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(255,82,82,0.05)',
                  border: '1px solid rgba(255,82,82,0.2)',
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger)', marginBottom: 6 }}>
                    ⚠️ Problèmes détectés
                  </div>
                  {ds.issues.map((issue, j) => (
                    <div key={j} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      {issue}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Recommendations */}
          {report.recommendations?.length > 0 && (
            <>
              <SectionTitle>🎯 Recommandations d'optimisation</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {report.recommendations.map((rec, i) => (
                  <div key={i} style={{
                    padding: '14px 16px',
                    background: 'var(--bg-secondary)',
                    border: `1px solid ${PRIORITY_COLORS[rec.priority] || 'var(--border)'}20`,
                    borderLeft: `3px solid ${PRIORITY_COLORS[rec.priority] || 'var(--border)'}`,
                    borderRadius: 10,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 20,
                        background: `${PRIORITY_COLORS[rec.priority]}20`,
                        color: PRIORITY_COLORS[rec.priority] || 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {rec.priority.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{rec.category}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {rec.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {rec.detail}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 13, fontWeight: 700, color: 'var(--accent)',
      fontFamily: 'var(--font-mono)', marginBottom: 14,
      paddingBottom: 8, borderBottom: '1px solid var(--border)',
      letterSpacing: '0.05em',
    }}>
      {children}
    </div>
  );
}

function StatCard({ kpi, s }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 8,
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
        {kpi.replace('_', ' ').toUpperCase()}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
        {s.mean}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>↓{s.min}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>↑{s.max}</span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>n={s.count}</span>
      </div>
    </div>
  );
}
