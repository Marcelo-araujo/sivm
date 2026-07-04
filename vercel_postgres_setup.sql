-- Vercel Postgres Schema para o SIVM

-- Certifique-se de ter a extensão uuid-ossp (se necessário, o vercel postgres já deve ter)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Equipamentos
CREATE TABLE IF NOT EXISTS equipamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    status_atual VARCHAR(50) CHECK (status_atual IN ('Verde', 'Amarelo', 'Vermelho')) DEFAULT 'Verde',
    area VARCHAR(100),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Inserir alguns dados mockados de equipamentos para testar
INSERT INTO equipamentos (nome, area, status_atual) VALUES
    ('Esteira Transportadora A1', 'Embalagem', 'Verde'),
    ('Painel Elétrico Principal', 'Subestação', 'Verde'),
    ('Motor Exaustor Teto', 'Usinagem', 'Verde'),
    ('Robô de Solda R3', 'Montagem', 'Verde'),
    ('Injetora Plástica 02', 'Moldagem', 'Verde')
ON CONFLICT DO NOTHING;

-- 2. Tabela de Intervenções
CREATE TABLE IF NOT EXISTS intervencoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipamento_id UUID REFERENCES equipamentos(id) ON DELETE CASCADE,
    texto_bruto_tecnico TEXT NOT NULL,
    causa_raiz TEXT,
    sistema_afetado TEXT,
    severidade VARCHAR(50) CHECK (severidade IN ('Baixa', 'Média', 'Alta', 'Crítica')),
    tempo_risco_horas NUMERIC,
    downtime_evitado_horas NUMERIC,
    resolvido_definitivo BOOLEAN DEFAULT false,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
