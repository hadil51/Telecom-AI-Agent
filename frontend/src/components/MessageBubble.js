import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      animation: 'fade-in-up 0.25s ease',
    }}>
      {!isUser && (
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: 'var(--accent-dim)', border: '1px solid var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>📡</div>
      )}

      <div style={{ maxWidth: isUser ? '70%' : '80%', minWidth: 80 }}>
        {/* Bubble */}
        <div style={{
          padding: '12px 16px',
          borderRadius: isUser ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
          background: isUser
            ? 'linear-gradient(135deg, var(--accent) 0%, #0099bb 100%)'
            : message.isError ? 'rgba(255,82,82,0.08)' : 'var(--bg-card)',
          border: isUser
            ? 'none'
            : message.isError
              ? '1px solid rgba(255,82,82,0.3)'
              : '1px solid var(--border)',
          color: isUser ? '#000' : 'var(--text-primary)',
          fontSize: 13.5,
          lineHeight: 1.65,
          boxShadow: isUser ? 'var(--shadow-accent)' : 'none',
        }}>
          <MarkdownText text={message.content} isUser={isUser} />
        </div>

        {/* Embedded chart */}
        {message.chart_data && (
          <div style={{ marginTop: 12 }}>
            <EmbeddedChart data={message.chart_data} />
          </div>
        )}

        {/* Timestamp */}
        <div style={{
          fontSize: 10, color: 'var(--text-muted)',
          marginTop: 4,
          textAlign: isUser ? 'right' : 'left',
          fontFamily: 'var(--font-mono)',
        }}>
          {formatTime(message.timestamp)}
        </div>
      </div>

      {isUser && (
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>👤</div>
      )}
    </div>
  );
}

// Simple markdown renderer
function MarkdownText({ text, isUser }) {
  const lines = text.split('\n');
  return (
    <div>
      {lines.map((line, i) => {
        // Bold **text**
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((p, j) => {
          if (p.startsWith('**') && p.endsWith('**')) {
            return <strong key={j} style={{ color: isUser ? '#000' : 'var(--accent)', fontWeight: 700 }}>
              {p.slice(2, -2)}
            </strong>;
          }
          // Inline code `code`
          const cparts = p.split(/(`[^`]+`)/g);
          return cparts.map((cp, k) => {
            if (cp.startsWith('`') && cp.endsWith('`')) {
              return <code key={k} style={{
                background: isUser ? 'rgba(0,0,0,0.2)' : 'var(--bg-secondary)',
                padding: '1px 5px', borderRadius: 4,
                fontFamily: 'var(--font-mono)', fontSize: 12,
                color: isUser ? '#000' : 'var(--accent)',
              }}>{cp.slice(1, -1)}</code>;
            }
            return <span key={k}>{cp}</span>;
          });
        });

        // List items
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
              <span style={{ color: isUser ? '#000' : 'var(--accent)', flexShrink: 0 }}>▸</span>
              <span>{rendered}</span>
            </div>
          );
        }

        // Headings #
        if (line.startsWith('# ')) {
          return <div key={i} style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, marginTop: 4 }}>
            {rendered}
          </div>;
        }

        return (
          <div key={i} style={{ marginBottom: line === '' ? 6 : 1 }}>
            {rendered}
          </div>
        );
      })}
    </div>
  );
}

function EmbeddedChart({ data }) {
  const chartData = data.labels.map((label, i) => ({
    name: label,
    value: data.values[i],
    count: data.counts?.[i] || 0,
    color: data.colors[i],
  }));

  const isPie = data.type === 'pie' || !data.type;

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 16,
      animation: 'fade-in-up 0.3s ease',
    }}>
      <div style={{
        fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
        marginBottom: 12, fontFamily: 'var(--font-mono)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ color: 'var(--accent)' }}>◈</span>
        {data.title}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        {isPie ? (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}%`}
              labelLine={false}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="var(--bg-primary)" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, n, p) => [`${v}% (${p.payload.count} mesures)`, 'Part']}
              contentStyle={{
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text-primary)', fontSize: 12,
              }}
            />
            <Legend
              formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{value}</span>}
            />
          </PieChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
            <Tooltip
              formatter={(v) => [`${v}%`, 'Pourcentage']}
              contentStyle={{
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text-primary)', fontSize: 12,
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>

      {/* Legend table */}
      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {chartData.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {d.name}: <strong style={{ color: 'var(--text-secondary)' }}>{d.value}%</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(ts) {
  if (!ts) return '';
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
