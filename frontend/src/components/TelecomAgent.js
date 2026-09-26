import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Sidebar } from './Sidebar';
import { ChatArea } from './ChatArea';
import { UploadModal } from './UploadModal';
import { ReportModal } from './ReportModal';

const API = 'http://localhost:8000/api';

export function TelecomAgent() {
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasets, setSelectedDatasets] = useState([]);
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: `**Bonjour ! Je suis votre assistant IA spécialisé en analyse télécom.** 📡

Vos campagnes Drive Test sont chargées et prêtes à être analysées :
- **DT1 — LTE 4G** : RSRP, RSRQ, Throughput DL
- **DT2 & DT3 — UMTS 3G** : RSCP, Ec/N0

**Exemples de questions :**
- *"Quelle est la qualité de couverture RSRP sur le dataset LTE ?"*
- *"Montre-moi un graphique de distribution du RSRQ"*
- *"Compare les performances 3G et 4G"*
- *"Génère un rapport complet avec recommandations"*

Sélectionnez vos datasets dans la barre latérale et posez votre question !`,
      timestamp: new Date(),
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load datasets on mount
  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    try {
      const res = await axios.get(`${API}/datasets`);
      setDatasets(res.data);
      // Auto-select all by default
      setSelectedDatasets(res.data.map(d => d.name));
    } catch (e) {
      console.error('Failed to load datasets', e);
    }
  };

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await axios.post(`${API}/chat`, {
        message: text,
        selected_datasets: selectedDatasets,
        history,
      });

      const aiMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: res.data.message,
        chart_data: res.data.chart_data || null,
        report: res.data.report || null,
        timestamp: new Date(),
      };

      if (aiMsg.report) {
        setReportData(aiMsg.report);
        setShowReport(true);
      }

      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      const errMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `❌ **Erreur de connexion au serveur**\n\nVérifiez que le backend FastAPI est lancé sur \`localhost:8000\`.\n\nCommande : \`uvicorn main:app --reload\``,
        timestamp: new Date(),
        isError: true,
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, selectedDatasets]);

  const handleUploadSuccess = (newDataset) => {
    fetchDatasets();
    setShowUpload(false);
    const notif = {
      id: Date.now(),
      role: 'assistant',
      content: `✅ **Fichier chargé avec succès !**\n\nNouveaux données disponibles : **${newDataset}**\nSélectionnez-le dans la barre latérale pour l'analyser.`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, notif]);
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--bg-primary)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Ambient background glow */}
      <div style={{
        position: 'fixed', top: '-20%', left: '-10%',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'fixed', bottom: '-20%', right: '-10%',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(124,77,255,0.04) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <Sidebar
        datasets={datasets}
        selectedDatasets={selectedDatasets}
        onToggleDataset={(name) => {
          setSelectedDatasets(prev =>
            prev.includes(name) ? prev.filter(d => d !== name) : [...prev, name]
          );
        }}
        onUpload={() => setShowUpload(true)}
        onReport={() => {
          if (reportData) setShowReport(true);
          else sendMessage("Génère un rapport complet d'analyse réseau avec recommandations");
        }}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(p => !p)}
      />

      <ChatArea
        messages={messages}
        loading={loading}
        onSend={sendMessage}
        sidebarOpen={sidebarOpen}
      />

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
          apiBase={API}
        />
      )}

      {showReport && reportData && (
        <ReportModal
          report={reportData}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
