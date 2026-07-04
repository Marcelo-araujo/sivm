import 'dotenv/config';
import { sql } from '@vercel/postgres';
import fs from 'fs';
import path from 'path';

async function initDB() {
  try {
    console.log('Conectando ao banco de dados...');
    
    // Lê o arquivo SQL
    const sqlContent = fs.readFileSync(path.join(process.cwd(), 'vercel_postgres_setup.sql'), 'utf8');
    
    // Como o driver Vercel Postgres não roda múltiplos statements com facilidade pelo método `sql` literal,
    // usaremos o cliente subjacente para executar o script bruto
    const { createPool } = await import('@vercel/postgres');
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING;
    const pool = createPool({ connectionString });

    console.log('Executando script de criação das tabelas...');
    await pool.query(sqlContent);
    
    await pool.end();
    console.log('✅ Banco de dados inicializado com sucesso e dados mockados inseridos!');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
  }
}

initDB();
