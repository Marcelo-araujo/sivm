import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // 1. Downtime Evitado Total (Soma de downtime_evitado_horas)
    const downtimeQuery = await sql`
      SELECT SUM(downtime_evitado_horas) as total_downtime_evitado 
      FROM intervencoes;
    `;
    const totalDowntime = parseFloat(downtimeQuery.rows[0]?.total_downtime_evitado || 0);

    // 2. Taxa de Resolução
    const statsQuery = await sql`
      SELECT 
        COUNT(*) as total_intervencoes,
        SUM(CASE WHEN resolvido_definitivo = true THEN 1 ELSE 0 END) as resolvidos_definitivo
      FROM intervencoes;
    `;
    const total = parseInt(statsQuery.rows[0]?.total_intervencoes || 0);
    const definitivos = parseInt(statsQuery.rows[0]?.resolvidos_definitivo || 0);
    const taxaResolucao = total > 0 ? ((definitivos / total) * 100).toFixed(1) : 0;

    // 3. Radar de Risco (Equipamentos com mais falhas nos últimos 7 dias)
    const radarQuery = await sql`
      SELECT 
        e.id, e.nome, e.status_atual, COUNT(i.id) as falhas_recentes
      FROM equipamentos e
      LEFT JOIN intervencoes i ON e.id = i.equipamento_id 
        AND i.criado_em >= NOW() - INTERVAL '7 days'
      GROUP BY e.id, e.nome, e.status_atual
      HAVING COUNT(i.id) > 0
      ORDER BY falhas_recentes DESC;
    `;

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
