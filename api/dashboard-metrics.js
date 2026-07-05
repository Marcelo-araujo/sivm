import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    
    // Obter datas do query ou definir padrão de últimas 12h
    let inicioStr = url.searchParams.get('inicio');
    let fimStr = url.searchParams.get('fim');

    // Se não vierem datas, assume as últimas 12 horas
    if (!inicioStr || !fimStr) {
      const now = new Date();
      const twelveHoursAgo = new Date(now.getTime() - (12 * 60 * 60 * 1000));
      inicioStr = twelveHoursAgo.toISOString();
      fimStr = now.toISOString();
    }

    // 1. KPIs Agregados baseados no período (usamos COALESCE caso data_inicio seja nulo nos testes antigos)
    const kpisQuery = await sql`
      SELECT 
        COUNT(id) as total_intervencoes,
        SUM(downtime_evitado_horas) as horas_salvas,
        SUM(tempo_risco_horas) as risco_total,
        SUM(CASE WHEN resolvido_definitivo = true THEN 1 ELSE 0 END) as total_resolvidos
      FROM intervencoes
      WHERE COALESCE(data_inicio, criado_em) >= ${inicioStr}::timestamp 
        AND COALESCE(data_inicio, criado_em) <= ${fimStr}::timestamp
    `;

    const totalDowntime = parseFloat(kpisQuery.rows[0]?.horas_salvas || 0);

    // 2. Radar de Risco (Equipamentos com mais falhas no período)
    const radarQuery = await sql`
      SELECT 
        e.id, e.nome, e.status_atual, COUNT(i.id) as falhas_recentes
      FROM equipamentos e
      LEFT JOIN intervencoes i ON e.id = i.equipamento_id 
        AND COALESCE(i.data_inicio, i.criado_em) >= ${inicioStr}::timestamp 
        AND COALESCE(i.data_inicio, i.criado_em) <= ${fimStr}::timestamp
      GROUP BY e.id, e.nome, e.status_atual
      HAVING COUNT(i.id) > 0
      ORDER BY falhas_recentes DESC;
    `;

    // 3. Histórico de Ações (Feed)
    const acoesQuery = await sql`
      SELECT 
        i.id,
        e.nome as maquina, 
        i.causa_raiz, 
        i.severidade, 
        COALESCE(i.data_inicio, i.criado_em) as data_ocorrencia,
        i.downtime_evitado_horas 
      FROM intervencoes i
      JOIN equipamentos e ON i.equipamento_id = e.id
      WHERE COALESCE(i.data_inicio, i.criado_em) >= ${inicioStr}::timestamp 
        AND COALESCE(i.data_inicio, i.criado_em) <= ${fimStr}::timestamp
      ORDER BY data_ocorrencia DESC
      LIMIT 20;
    `;

    const total = parseInt(kpisQuery.rows[0]?.total_intervencoes || 0);
    const definitivos = parseInt(kpisQuery.rows[0]?.total_resolvidos || 0);
    const taxaResolucao = total > 0 ? ((definitivos / total) * 100).toFixed(1) : 0;

    return response.status(200).json({
      metrics: {
        downtimeEvitado: totalDowntime,
        taxaResolucao: parseFloat(taxaResolucao),
      },
      radar: radarQuery.rows,
      acoes: acoesQuery.rows
    });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
