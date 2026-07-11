import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, CheckCircle, Clock, AlertTriangle, Download, FileText } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';


export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [radar, setRadar] = useState([]);
  const [acoes, setAcoes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Default: Últimas 12 horas
  const now = new Date();
  const twelveHoursAgo = new Date(now.getTime() - (12 * 60 * 60 * 1000));
  
  // Format for datetime-local (YYYY-MM-DDThh:mm)
  const formatForInput = (d) => d.toISOString().slice(0, 16);
  
  const [filtroInicio, setFiltroInicio] = useState(formatForInput(twelveHoursAgo));
  const [filtroFim, setFiltroFim] = useState(formatForInput(now));

  const dashboardRef = useRef(null);

  const fetchMetrics = async (overrideInicio = null, overrideFim = null) => {
    setLoading(true);
    try {
      const inicioUTC = new Date(overrideInicio || filtroInicio).toISOString();
      const fimUTC = new Date(overrideFim || filtroFim).toISOString();
      
      const response = await fetch(`/api/dashboard-metrics?inicio=${inicioUTC}&fim=${fimUTC}`);
      const data = await response.json();
      if (data.metrics) setMetrics(data.metrics);
      if (data.radar) setRadar(data.radar);
      if (data.acoes) setAcoes(data.acoes);
    } catch (err) {
      console.error('Error fetching metrics', err);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; 
    
    let novoInicio, novoFim;

    if (preset === 'T1') {
      novoInicio = `${todayStr}T07:00`;
      novoFim = `${todayStr}T16:48`;
    } else if (preset === 'T2') {
      const tomorrow = new Date(now.getTime() + 24*60*60*1000);
      novoInicio = `${todayStr}T16:48`;
      novoFim = `${tomorrow.toISOString().split('T')[0]}T02:02`;
    } else if (preset === 'T3') {
      const tomorrow = new Date(now.getTime() + 24*60*60*1000);
      novoInicio = `${todayStr}T22:18`;
      novoFim = `${tomorrow.toISOString().split('T')[0]}T07:00`;
    } else if (preset === 'Semana') {
      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diffToMonday));
      const friday = new Date(monday.getTime() + 4 * 24 * 60 * 60 * 1000);
      
      novoInicio = `${monday.toISOString().split('T')[0]}T00:00`;
      novoFim = `${friday.toISOString().split('T')[0]}T23:59`;
    }

    setFiltroInicio(novoInicio);
    setFiltroFim(novoFim);
    fetchMetrics(novoInicio, novoFim);
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const exportDashboard = async () => {
    if (!dashboardRef.current) return;
    try {
      // 1. Geramos a imagem com pixelRatio: 2 (alta definição) para aguentar a compressão do WhatsApp
      const dataUrl = await htmlToImage.toPng(dashboardRef.current, { 
        backgroundColor: '#111827',
        pixelRatio: 2,
        style: {
          transform: 'scale(1)',
        }
      });

      // 2. Tenta compartilhar diretamente usando a Web Share API se suportado (comum em celulares)
      if (navigator.share && navigator.canShare) {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `sivm-relatorio-${new Date().toISOString().split('T')[0]}.png`, { type: 'image/png' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Relatório SIVM',
            text: 'Confira a Visibilidade Operacional do SIVM',
          });
          return;
        }
      }

      // Fallback para download convencional
      const link = document.createElement('a');
      link.download = `sivm-relatorio-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Erro ao exportar dashboard:', error);
      alert('Não foi possível exportar a imagem.');
    }
  };

  const exportDashboardPDF = async () => {
    if (!dashboardRef.current) return;
    try {
      // 1. Gera a imagem do elemento com alta densidade de pixels (pixelRatio: 2)
      const dataUrl = await htmlToImage.toPng(dashboardRef.current, { 
        backgroundColor: '#111827',
        pixelRatio: 2,
        style: {
          transform: 'scale(1)',
        }
      });
      
      // 2. Cria o documento PDF (formato A4 em paisagem 'l')
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Mantém a proporção da imagem com margem de 10mm
      const ratio = imgProps.width / imgProps.height;
      let width = pdfWidth - 20; 
      let height = width / ratio;
      
      if (height > (pdfHeight - 20)) {
        height = pdfHeight - 20;
        width = height * ratio;
      }
      
      const x = (pdfWidth - width) / 2;
      const y = (pdfHeight - height) / 2;
      
      pdf.addImage(dataUrl, 'PNG', x, y, width, height);
      pdf.save(`sivm-relatorio-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('Não foi possível exportar o PDF.');
    }
  };


  const getColor = (status) => {
    if (status === 'Vermelho') return 'var(--status-red)';
    if (status === 'Amarelo') return 'var(--status-yellow)';
    return 'var(--status-green)';
  };

  const criticalCount = radar.filter(r => r.status_atual === 'Vermelho').length;
  const globalStatusColor = criticalCount > 0 ? 'var(--status-red)' : 'var(--status-green)';
  const GlobalStatusIcon = criticalCount > 0 ? AlertTriangle : CheckCircle;

  return (
    <div style={{ padding: '2rem 1rem', maxWidth: '1200px', margin: '0 auto', color: '#fff' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, background: 'linear-gradient(45deg, #4ade80, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Visibilidade Operacional
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>Métricas traduzidas pelo SIVM</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button onClick={() => applyPreset('T1')} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>T1 (07:00 - 16:48)</button>
          <button onClick={() => applyPreset('T2')} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>T2 (16:48 - 02:02)</button>
          <button onClick={() => applyPreset('T3')} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>T3 (22:18 - 07:00)</button>
          <button onClick={() => applyPreset('Semana')} style={{ padding: '6px 12px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>Resumo Semanal</button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#aaa' }}>Início:</label>
            <input 
              type="datetime-local" 
              value={filtroInicio}
              onChange={(e) => setFiltroInicio(e.target.value)}
              style={{ background: 'transparent', color: '#fff', border: '1px solid #444', borderRadius: '4px', padding: '4px 8px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#aaa' }}>Fim:</label>
            <input 
              type="datetime-local" 
              value={filtroFim}
              onChange={(e) => setFiltroFim(e.target.value)}
              style={{ background: 'transparent', color: '#fff', border: '1px solid #444', borderRadius: '4px', padding: '4px 8px' }}
            />
          </div>
          <button 
            onClick={() => fetchMetrics()}
            style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
          >
            Filtrar
          </button>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
            <button 
              onClick={exportDashboard}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            >
              <Download size={16} />
              PNG Alta Resolução
            </button>
            
            <button 
              onClick={exportDashboardPDF}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
            >
              <FileText size={16} />
              PDF (Ideal WhatsApp)
            </button>
          </div>

        </div>
      </div>

      <div ref={dashboardRef} style={{ padding: '10px', background: 'var(--bg-color)', borderRadius: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-lg)' }}>
                <Clock color="var(--accent-blue)" size={32} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 700 }}>{loading ? '-' : metrics?.downtimeEvitado}h</h3>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Downtime Evitado</p>
              </div>
            </div>
          </div>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-lg)' }}>
                <Activity color="var(--status-green)" size={32} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 700 }}>{loading ? '-' : metrics?.taxaResolucao}%</h3>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Resolução na Causa Raiz</p>
              </div>
            </div>
          </div>
        </div>

        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={20} color="var(--status-yellow)" /> Radar de Risco
        </h2>
        <div className="glass-card" style={{ padding: '1.5rem', height: '400px' }}>
          {loading ? (
            <div className="flex-center" style={{ height: '100%' }}>Carregando radar...</div>
          ) : radar.length === 0 ? (
            <div className="flex-center" style={{ height: '100%', color: 'var(--text-secondary)' }}>Nenhuma falha detectada no período.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={radar} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="nome" type="category" width={150} tick={{ fill: '#fff', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ background: '#1f2937', border: 'none', borderRadius: '8px' }}
                />
                <Bar dataKey="falhas_recentes" radius={[0, 4, 4, 0]} barSize={24}>
                  {radar.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getColor(entry.status_atual)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Histórico de Ações (Novo Feed) */}
        <h2 style={{ fontSize: '1.25rem', marginTop: '3rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Histórico de Ações
        </h2>
        <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
          {loading ? (
             <div className="flex-center">Carregando ações...</div>
          ) : acoes.length === 0 ? (
             <div className="flex-center" style={{ color: 'var(--text-secondary)' }}>Nenhuma intervenção registrada neste período.</div>
          ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               {acoes.map(acao => (
                 <div key={acao.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                     <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                       {new Date(acao.data_ocorrencia).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                     </span>
                     <span style={{ 
                       padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                       background: acao.severidade === 'Crítica' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                       color: acao.severidade === 'Crítica' ? '#ef4444' : '#fff'
                     }}>
                       {acao.severidade}
                     </span>
                   </div>
                   <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem', color: '#fff' }}>
                     {acao.maquina}
                   </div>
                   <div style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '1rem', lineHeight: '1.4' }}>
                     {acao.causa_raiz}
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
                     <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Downtime Evitado</span>
                     <span style={{ fontWeight: 'bold', color: '#4ade80' }}>
                       {acao.downtime_evitado_horas > 0 ? `+${acao.downtime_evitado_horas}h` : '-'}
                     </span>
                   </div>
                 </div>
               ))}
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
