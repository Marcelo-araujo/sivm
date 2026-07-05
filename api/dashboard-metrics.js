import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    const periodo = url.searchParams.get('periodo') || '7d';
    const intervalStr = periodo === '24h' ? '24 hours' : '7 days';

    // 1. KPIs Agregados baseados no período
    const kpisQuery = await sql`
      SELECT 
        COUNT(id) as total_intervencoes,
        SUM(downtime_evitado_horas) as horas_salvas,
        SUM(tempo_risco_horas) as risco_total,
        SUM(CASE WHEN resolvido_definitivo = true THEN 1 ELSE 0 END) as total_resolvidos
      FROM intervencoes
      WHERE criado_em >= NOW() - ${intervalStr}::interval
    `;

    const totalDowntime = parseFloat(kpisQuery.rows[0]?.horas_salvas || 0);

    // 2. Radar de Risco (Equipamentos com mais falhas recentes)
    const radarQuery = await sql`
      SELECT 
        e.id, e.nome, e.status_atual, COUNT(i.id) as falhas_recentes
      FROM equipamentos e
      LEFT JOIN intervencoes i ON e.id = i.equipamento_id 
        AND i.criado_em >= NOW() - ${intervalStr}::interval
      GROUP BY e.id, e.nome, e.status_atual
      HAVING COUNT(i.id) > 0
      ORDER BY falhas_recentes DESC;
    `;

    const total = parseInt(kpisQuery.rows[0]?.total_intervencoes || 0);
    const definitivos = parseInt(kpisQuery.rows[0]?.total_resolvidos || 0);
    const taxaResolucao = total > 0 ? ((definitivos / total) * 100).toFixed(1) : 0;

    return response.status(200).json({
      metrics: {
        downtimeEvitado: totalDowntime,
        taxaResolucao: parseFloat(taxaResolucao),
      },
      radar: radarQuery.rows
    });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
