import { sql } from '@vercel/postgres';

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') {
      const { rows } = await sql`SELECT * FROM equipamentos ORDER BY nome ASC;`;
      return response.status(200).json(rows);
    }
    
    return response.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    return response.status(500).json({ error: error.message });
  }
}
