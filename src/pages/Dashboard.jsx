import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, CheckCircle, Clock, AlertTriangle, Download } from 'lucide-react';
import * as htmlToImage from 'html-to-image';

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [radar, setRadar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('24h');
  const dashboardRef = useRef(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/dashboard-metrics?periodo=${periodo}`);
        const data = await response.json();
        if (data.metrics) setMetrics(data.metrics);
        if (data.radar) setRadar(data.radar);
      } catch (err) {
        console.error('Error fetching metrics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [periodo]);

  const exportDashboard = () => {
    if (dashboardRef.current) {
      htmlToImage.toPng(dashboardRef.current, { backgroundColor: '#111827' })
        .then(function (dataUrl) {
          const link = document.createElement('a');
          link.download = `sivm-relatorio-${periodo}-${new Date().toISOString().split('T')[0]}.png`;
          link.href = dataUrl;
          link.click();
        })
        .catch(function (error) {
          console.error('Erro ao exportar dashboard:', error);
          alert('Não foi possível exportar a imagem.');
        });
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

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px' }}>
            <button 
              onClick={() => setPeriodo('24h')}
              style={{ padding: '8px 16px', background: periodo === '24h' ? 'rgba(74,222,128,0.2)' : 'transparent', color: periodo === '24h' ? '#4ade80' : '#aaa', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              Turno (24h)
            </button>
            <button 
              onClick={() => setPeriodo('7d')}
              style={{ padding: '8px 16px', background: periodo === '7d' ? 'rgba(74,222,128,0.2)' : 'transparent', color: periodo === '7d' ? '#4ade80' : '#aaa', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
            >
              Semanal
            </button>
          </div>
          
          <button 
            onClick={exportDashboard}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
          >
            <Download size={18} />
            Exportar Relatório
          </button>
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
      </div>
    </div>
  );
}
