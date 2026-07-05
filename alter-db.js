import 'dotenv/config';

async function alterDB() {
  try {
    const { createPool } = await import('@vercel/postgres');
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    const pool = createPool({ connectionString });

    console.log('Adicionando novas colunas de data/hora...');
    await pool.query(`ALTER TABLE intervencoes ADD COLUMN IF NOT EXISTS data_inicio TIMESTAMP;`);
    await pool.query(`ALTER TABLE intervencoes ADD COLUMN IF NOT EXISTS data_fim TIMESTAMP;`);
    
    await pool.end();
    console.log('✅ Banco de dados atualizado com as novas colunas!');
  } catch (error) {
    console.error('❌ Erro ao atualizar banco de dados:', error);
  }
}

alterDB();
