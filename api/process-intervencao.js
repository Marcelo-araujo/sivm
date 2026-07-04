import { sql } from '@vercel/postgres';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Método não permitido' });
  }

  const { nome_equipamento, texto_bruto } = request.body;

  if (!nome_equipamento || !texto_bruto) {
    return response.status(400).json({ error: 'nome_equipamento e texto_bruto são obrigatórios' });
  }

  try {
    // 0. Buscar ou Criar Equipamento
    let equipId;
    const findEquip = await sql`SELECT id FROM equipamentos WHERE nome ILIKE ${nome_equipamento} LIMIT 1`;
    
    if (findEquip.rowCount > 0) {
      equipId = findEquip.rows[0].id;
    } else {
      const newEquip = await sql`
        INSERT INTO equipamentos (nome, status_atual) 
        VALUES (${nome_equipamento}, 'Verde') 
        RETURNING id
      `;
      equipId = newEquip.rows[0].id;
    }

    // 1. Instanciar Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // 2. Prompt Estruturado para o Gemini
    const prompt = `
    Você é um assistente especialista em manutenção industrial. 
    Sua tarefa é analisar o relato de intervenção técnica a seguir e extrair métricas de negócio e classificação de risco.
    
    Relato do Técnico: "${texto_bruto}"

    Responda EXATAMENTE no formato JSON abaixo, sem blocos de código Markdown (\`\`\`), apenas o JSON puro:
    {
      "causa_raiz": "Descrição resumida do que causou o problema",
      "sistema_afetado": "Qual parte da máquina falhou",
      "severidade": "Escolha entre: Baixa, Média, Alta, Crítica",
      "tempo_risco_horas": Número inteiro representando quantas horas a máquina ficaria em risco de quebrar,
      "downtime_evitado_horas": Número inteiro com a estimativa de horas de máquina parada que o técnico evitou,
      "resolvido_definitivo": true ou false (true se a causa raiz foi resolvida, false se foi paliativo)
    }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Limpeza de markdown caso o modelo insista em colocar
    const cleanJson = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const iaData = JSON.parse(cleanJson);

    // 3. Salvar no Vercel Postgres
    const insertQuery = await sql`
      INSERT INTO intervencoes (
        equipamento_id, 
        texto_bruto_tecnico, 
        causa_raiz, 
        sistema_afetado, 
        severidade, 
        tempo_risco_horas, 
        downtime_evitado_horas, 
        resolvido_definitivo
      ) VALUES (
        ${equipId},
        ${texto_bruto},
        ${iaData.causa_raiz},
        ${iaData.sistema_afetado},
        ${iaData.severidade},
        ${iaData.tempo_risco_horas},
        ${iaData.downtime_evitado_horas},
        ${iaData.resolvido_definitivo}
      ) RETURNING id;
    `;

    // 4. Atualizar o status do equipamento dependendo da severidade
    let novoStatus = 'Verde';
    if (iaData.severidade === 'Crítica' && !iaData.resolvido_definitivo) novoStatus = 'Vermelho';
    else if (iaData.severidade === 'Alta' && !iaData.resolvido_definitivo) novoStatus = 'Amarelo';
    
    if (novoStatus !== 'Verde') {
      await sql`UPDATE equipamentos SET status_atual = ${novoStatus} WHERE id = ${equipId}`;
    }

    return response.status(200).json({ 
      success: true, 
      id: insertQuery.rows[0].id,
      extraido: iaData
    });

  } catch (error) {
    console.error('Erro no processamento da IA:', error);
    return response.status(500).json({ error: error.message });
  }
}
