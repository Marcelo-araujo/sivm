import React, { useState, useEffect } from 'react';
import { Activity, Clock, ShieldCheck, AlertOctagon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({ downtimeEvitado: 0, taxaResolucao: 0 });
  const [radar, setRadar] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = () => {
    fetch('/api/dashboard-metrics')
      .then(res => res.json())
      .then(data => {
        if (data.metrics) setMetrics(data.metrics);
        if (data.radar) setRadar(data.radar);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao buscar dashboard:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboardData();
    // Refresh a cada 30 segundos
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cores dinâmicas para o Radar baseadas no status
  const getColor = (status) => {
    if (status === 'Vermelho') return 'var(--status-red)';
    if (status === 'Amarelo') return 'var(--status-yellow)';
    return 'var(--status-green)';
  };

  // Status Geral da Planta
  const criticalCount = radar.filter(r => r.status_atual === 'Vermelho').length;
  const globalStatusColor = criticalCount > 0 ? 'var(--status-red)' : 'var(--status-green)';
  const GlobalStatusIcon = criticalCount > 0 ? AlertOctagon : ShieldCheck;

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>SIVM Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Inteligência e Visibilidade em Tempo Real</p>
        </div>
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', border: `1px solid ${globalStatusColor}` }}>
          <GlobalStatusIcon color={globalStatusColor} size={24} />
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Status da Planta</div>
            <div style={{ fontWeight: 'bold', color: globalStatusColor }}>{criticalCount > 0 ? 'CRÍTICO' : 'ESTÁVEL'}</div>
          </div>
        </div>
      </header>

      {/* KPIs Principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* KPI 1 */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-lg)' }}>
              <Clock color="var(--accent-blue)" size={32} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 700 }}>{loading ? '-' : metrics.downtimeEvitado}h</h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Downtime Evitado (Acumulado)</p>
            </div>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-purple))' }}></div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-lg)' }}>
              <Activity color="var(--status-green)" size={32} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 700 }}>{loading ? '-' : metrics.taxaResolucao}%</h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Resolução na Causa Raiz</p>
            </div>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${metrics.taxaResolucao}%`, height: '100%', background: 'var(--status-green)', transition: 'width 1s ease' }}></div>
          </div>
        </div>
      </div>

      {/* Radar de Risco */}
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <AlertOctagon size={20} color="var(--status-yellow)" /> Radar de Risco (Últimos 7 dias)
      </h2>
      <div className="glass-card" style={{ padding: '1.5rem', height: '400px' }}>
        {loading ? (
          <div className="flex-center" style={{ height: '100%' }}>Carregando radar...</div>
        ) : radar.length === 0 ? (
          <div className="flex-center" style={{ height: '100%', color: 'var(--text-secondary)' }}>Nenhuma falha recente detectada.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={radar} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="nome" type="category" width={150} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}
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
  );
}
