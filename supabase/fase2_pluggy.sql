-- =============================================================================
-- Fase 2 — Conexão automática com os bancos via Pluggy (Open Finance)
--
-- Rode este arquivo no SQL Editor do Supabase DEPOIS do fase1_familia_contas.sql.
-- É idempotente: pode rodar mais de uma vez sem erro.
--
-- O que muda:
--   1. pluggy_itens: cada banco conectado (um "item" na Pluggy) de cada pessoa.
--   2. contas ganha pluggy_item_id, para saber de qual conexão a conta veio.
-- =============================================================================

CREATE TABLE IF NOT EXISTS pluggy_itens (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Quem conectou. A Pluggy guarda o mesmo id em clientUserId, e o servidor
  -- confere os dois antes de sincronizar.
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id       TEXT NOT NULL UNIQUE,      -- id do item na Pluggy
  conector      TEXT NOT NULL DEFAULT '',  -- nome do banco (ex: "Nubank")
  conector_logo TEXT,
  status        TEXT NOT NULL DEFAULT 'UPDATING', -- status do item na Pluggy
  erro          TEXT,                      -- mensagem do último erro, se houver
  ultima_sync   TIMESTAMPTZ,               -- quando o app trouxe os dados pela última vez
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pluggy_itens_user ON pluggy_itens(user_id);

ALTER TABLE pluggy_itens ENABLE ROW LEVEL SECURITY;

-- A família vê, atualiza e remove as conexões; criar, só para si mesmo.
DROP POLICY IF EXISTS "pluggy_itens_select" ON pluggy_itens;
CREATE POLICY "pluggy_itens_select" ON pluggy_itens FOR SELECT
  USING (user_id IN (SELECT public.ids_da_familia()));

DROP POLICY IF EXISTS "pluggy_itens_insert" ON pluggy_itens;
CREATE POLICY "pluggy_itens_insert" ON pluggy_itens FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "pluggy_itens_update" ON pluggy_itens;
CREATE POLICY "pluggy_itens_update" ON pluggy_itens FOR UPDATE
  USING (user_id IN (SELECT public.ids_da_familia()))
  WITH CHECK (user_id IN (SELECT public.ids_da_familia()));

DROP POLICY IF EXISTS "pluggy_itens_delete" ON pluggy_itens;
CREATE POLICY "pluggy_itens_delete" ON pluggy_itens FOR DELETE
  USING (user_id IN (SELECT public.ids_da_familia()));

CREATE OR REPLACE TRIGGER trg_pluggy_itens_updated_at
  BEFORE UPDATE ON pluggy_itens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Conta → conexão de origem. Ao desconectar o banco, a conta vira manual e
-- mantém o histórico.
ALTER TABLE contas ADD COLUMN IF NOT EXISTS pluggy_item_id TEXT;

-- Uma conta da Pluggy (external_id = id da conta lá) aparece uma vez só.
CREATE UNIQUE INDEX IF NOT EXISTS uq_contas_pluggy_external
  ON contas(external_id) WHERE origem = 'pluggy';

-- A view contas_saldo usa c.*; recriar para incluir a coluna nova (DROP porque
-- a coluna entra no meio e o CREATE OR REPLACE não aceita isso).
DROP VIEW IF EXISTS contas_saldo;
CREATE VIEW contas_saldo WITH (security_invoker = true) AS
  SELECT c.*,
         c.saldo_inicial + COALESCE(t.total, 0) AS saldo,
         t.ultima_data
    FROM contas c
    LEFT JOIN (
      SELECT conta_id, SUM(valor) AS total, MAX(data) AS ultima_data
        FROM transacoes GROUP BY conta_id
    ) t ON t.conta_id = c.id;
