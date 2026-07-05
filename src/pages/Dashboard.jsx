import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, CheckCircle, Clock, AlertTriangle, Download } from 'lucide-react';
import * as htmlToImage from 'html-to-image';

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

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // Converte a string local para UTC (formato esperado pelo PG)
      const inicioUTC = new Date(filtroInicio).toISOString();
      const fimUTC = new Date(filtroFim).toISOString();
      
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

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const exportDashboard = () => {
    if (dashboardRef.current) {
      htmlToImage.toPng(dashboardRef.current, { backgroundColor: '#111827' })
        .then(function (dataUrl) {
          const link = document.createElement('a');
          link.download = `sivm-relatorio-${new Date().toISOString().split('T')[0]}.png`;
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
            onClick={fetchMetrics}
            style={{ padding: '6px 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
          >
            Filtrar
          </button>
          
          <button 
            onClick={exportDashboard}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}
          >
            <Download size={16} />
            Exportar
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
             <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
               <thead>
                 <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                   <th style={{ padding: '10px 0' }}>Data/Hora</th>
                   <th style={{ padding: '10px 0' }}>Máquina</th>
                   <th style={{ padding: '10px 0' }}>Causa Raiz (Ação)</th>
                   <th style={{ padding: '10px 0' }}>Severidade</th>
                   <th style={{ padding: '10px 0', textAlign: 'right' }}>Horas Salvas</th>
                 </tr>
               </thead>
               <tbody>
                 {acoes.map(acao => (
                   <tr key={acao.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                     <td style={{ padding: '12px 0', fontSize: '0.9rem' }}>
                        {new Date(acao.data_ocorrencia).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                     </td>
                     <td style={{ padding: '12px 0', fontWeight: 'bold' }}>{acao.maquina}</td>
                     <td style={{ padding: '12px 0', fontSize: '0.9rem', color: '#ccc' }}>{acao.causa_raiz}</td>
                     <td style={{ padding: '12px 0' }}>
                       <span style={{ 
                         padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600,
                         background: acao.severidade === 'Crítica' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                         color: acao.severidade === 'Crítica' ? '#ef4444' : '#fff'
                       }}>
                         {acao.severidade}
                       </span>
                     </td>
                     <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', color: '#4ade80' }}>
                       {acao.downtime_evitado_horas > 0 ? `+${acao.downtime_evitado_horas}h` : '-'}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          )}
        </div>
      </div>
    </div>
  );
}
