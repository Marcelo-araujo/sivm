import React, { useState, useEffect } from 'react';
import { Mic, Send, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function MobileInput() {
  const [equipamentos, setEquipamentos] = useState([]);
  const [selectedEquip, setSelectedEquip] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [textoBruto, setTextoBruto] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [iaFeedback, setIaFeedback] = useState(null);

  // Buscar equipamentos ao carregar
  useEffect(() => {
    fetch('/api/equipamentos')
      .then(res => res.json())
      .then(data => {
        if(Array.isArray(data)) setEquipamentos(data);
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEquip || !textoBruto.trim() || !dataInicio || !dataFim) return;

    setStatus('loading');
    try {
      const res = await fetch('/api/process-intervencao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_equipamento: selectedEquip,
          texto_bruto: textoBruto,
          data_inicio: dataInicio,
          data_fim: dataFim
        })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setStatus('success');
        setIaFeedback(data.extraido);
        setTextoBruto(''); // Limpar campo
        setDataInicio('');
        setDataFim('');
        
        // Voltar ao normal após 5 segundos
        setTimeout(() => {
          setStatus('idle');
          setIaFeedback(null);
        }, 5000);
      } else {
        throw new Error(data.error || 'Erro ao processar');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '600px', padding: '1rem' }}>
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          SIVM Field
        </h1>
        <p style={{ fontSize: '0.9rem' }}>Fricção Zero. Relate e volte ao trabalho.</p>
      </header>

      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '1.5rem' }}>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            Equipamento
          </label>
          <input 
            type="text"
            list="equipamentos-list"
            className="input-field" 
            placeholder="Digite ou selecione a máquina..."
            value={selectedEquip}
            onChange={(e) => setSelectedEquip(e.target.value)}
            disabled={status === 'loading'}
            required
          />
          <datalist id="equipamentos-list">
            {equipamentos.map(eq => (
              <option key={eq.id} value={eq.nome} />
            ))}
          </datalist>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Início
            </label>
            <input 
              type="datetime-local" 
              className="input-field"
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              required
              disabled={status === 'loading'}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Fim
            </label>
            <input 
              type="datetime-local" 
              className="input-field"
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              required
              disabled={status === 'loading'}
            />
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            <span>O que foi feito?</span>
            {/* placeholder for future native dictation trigger if wrapped in PWA */}
            <Mic size={18} color="var(--accent-blue)" />
          </label>
          <textarea 
            className="input-field"
            rows="5"
            placeholder="Ex: Fonte chaveada em curto, troquei contator e refiz cabeamento."
            value={textoBruto}
            onChange={(e) => setTextoBruto(e.target.value)}
            disabled={status === 'loading'}
            required
            style={{ resize: 'vertical', minHeight: '120px' }}
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          style={{ width: '100%', height: '54px' }}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? (
            <><Loader2 className="spin" size={20} /> Extraindo Inteligência...</>
          ) : (
            <><Send size={20} /> Enviar Relatório</>
          )}
        </button>
      </form>

      {/* Feedback State */}
      {status === 'success' && iaFeedback && (
        <div className="glass-card" style={{ marginTop: '1.5rem', padding: '1.5rem', borderLeft: '4px solid var(--status-green)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--status-green)' }}>
            <CheckCircle size={24} />
            <h3 style={{ margin: 0 }}>Registrado e Processado!</h3>
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <p><strong>Causa Raiz:</strong> {iaFeedback.causa_raiz}</p>
            <p><strong>Risco Calculado:</strong> {iaFeedback.severidade}</p>
            <p><strong>Downtime Evitado:</strong> {iaFeedback.downtime_evitado_horas}h</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="glass-card" style={{ marginTop: '1.5rem', padding: '1rem', borderLeft: '4px solid var(--status-red)', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-red)' }}>
          <AlertTriangle size={20} />
          <span>Erro ao processar. Tente novamente.</span>
        </div>
      )}

      {/* Global Style overrides for this component specifically */}
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
