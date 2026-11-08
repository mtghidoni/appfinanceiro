-- =============================================================================
-- Fase 1 — Painel da família + contas e transações
--
-- Rode este arquivo no SQL Editor do Supabase DEPOIS do schema.sql.
-- É idempotente: pode rodar mais de uma vez sem erro.
--
-- O que muda:
--   1. Família: duas (ou mais) contas de acesso passam a ver e editar os mesmos
--      dados. Quem não está em família continua vendo só os próprios dados.
--   2. Contas (corrente, cartão, investimento...) e transações com data exata,
--      prontas para receber extratos importados (OFX/CSV) e, na fase 2, o Pluggy.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Família
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS familias (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome           TEXT NOT NULL DEFAULT 'Família',
  codigo_convite TEXT NOT NULL UNIQUE,
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Cada usuário pertence a no máximo uma família (UNIQUE em user_id).
CREATE TABLE IF NOT EXISTS familia_membros (
  familia_id UUID NOT NULL REFERENCES familias(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (familia_id, user_id)
);

-- Família do usuário logado (NULL se não estiver em nenhuma).
-- SECURITY DEFINER evita recursão nas políticas de familia_membros.
CREATE OR REPLACE FUNCTION public.minha_familia_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT familia_id FROM familia_membros WHERE user_id = auth.uid();
$$;

-- Usuários cujos dados o usuário logado pode ver: ele mesmo + membros da família.
CREATE OR REPLACE FUNCTION public.ids_da_familia()
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid()
  UNION
  SELECT b.user_id
    FROM familia_membros a
    JOIN familia_membros b ON b.familia_id = a.familia_id
   WHERE a.user_id = auth.uid();
$$;

ALTER TABLE familias        ENABLE ROW LEVEL SECURITY;
ALTER TABLE familia_membros ENABLE ROW LEVEL SECURITY;

-- Só leitura pelo app; criar/entrar/sair é feito pelas funções abaixo.
DROP POLICY IF EXISTS "familia_select" ON familias;
CREATE POLICY "familia_select" ON familias
  FOR SELECT USING (id = (SELECT public.minha_familia_id()));

DROP POLICY IF EXISTS "membros_select" ON familia_membros;
CREATE POLICY "membros_select" ON familia_membros
  FOR SELECT USING (familia_id = (SELECT public.minha_familia_id()));

-- Nome curto a partir do e-mail (ex: "matheus" de matheus@...).
CREATE OR REPLACE FUNCTION public._nome_do_usuario(uid UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT COALESCE(NULLIF(split_part(email, '@', 1), ''), 'Membro') FROM auth.users WHERE id = uid;
$$;
REVOKE ALL ON FUNCTION public._nome_do_usuario(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.criar_familia(p_nome TEXT DEFAULT 'Família')
RETURNS familias LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  f familias;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF EXISTS (SELECT 1 FROM familia_membros WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Você já faz parte de uma família';
  END IF;
  INSERT INTO familias (nome, codigo_convite, created_by)
  VALUES (
    COALESCE(NULLIF(trim(p_nome), ''), 'Família'),
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    auth.uid()
  )
  RETURNING * INTO f;
  INSERT INTO familia_membros (familia_id, user_id, nome)
  VALUES (f.id, auth.uid(), public._nome_do_usuario(auth.uid()));
  RETURN f;
END;
$$;

CREATE OR REPLACE FUNCTION public.entrar_familia(p_codigo TEXT)
RETURNS familias LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  f familias;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF EXISTS (SELECT 1 FROM familia_membros WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Você já faz parte de uma família';
  END IF;
  SELECT * INTO f FROM familias WHERE codigo_convite = upper(trim(p_codigo));
  IF NOT FOUND THEN RAISE EXCEPTION 'Código de convite inválido'; END IF;
  INSERT INTO familia_membros (familia_id, user_id, nome)
  VALUES (f.id, auth.uid(), public._nome_do_usuario(auth.uid()));
  RETURN f;
END;
$$;

-- Sai da família. Os dados continuam com quem os criou; a família vazia é apagada.
CREATE OR REPLACE FUNCTION public.sair_familia()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  fid UUID;
BEGIN
  DELETE FROM familia_membros WHERE user_id = auth.uid() RETURNING familia_id INTO fid;
  IF fid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM familia_membros WHERE familia_id = fid) THEN
    DELETE FROM familias WHERE id = fid;
  END IF;
END;
$$;

-- Como o usuário aparece para a família (ex: "Matheus", "Ana").
CREATE OR REPLACE FUNCTION public.definir_meu_nome(p_nome TEXT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE familia_membros SET nome = left(trim(p_nome), 40)
   WHERE user_id = auth.uid() AND trim(p_nome) <> '';
$$;

-- Gera um novo código (invalida o anterior), ex: se o código vazou.
CREATE OR REPLACE FUNCTION public.novo_codigo_convite()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cod TEXT := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
BEGIN
  UPDATE familias SET codigo_convite = cod WHERE id = public.minha_familia_id();
  RETURN cod;
END;
$$;

REVOKE ALL ON FUNCTION public.criar_familia(TEXT)      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.entrar_familia(TEXT)     FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sair_familia()           FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.definir_meu_nome(TEXT)   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.novo_codigo_convite()    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_familia(TEXT)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.entrar_familia(TEXT)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.sair_familia()         TO authenticated;
GRANT EXECUTE ON FUNCTION public.definir_meu_nome(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.novo_codigo_convite()  TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. Tabelas existentes passam a ser compartilhadas com a família
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "owner_gastos_fixos"    ON gastos_fixos;
DROP POLICY IF EXISTS "owner_gastos_variados" ON gastos_variados;
DROP POLICY IF EXISTS "owner_entradas"        ON entradas;
DROP POLICY IF EXISTS "owner_movimentacoes"   ON movimentacoes;
DROP POLICY IF EXISTS "owner_parcelamentos"   ON parcelamentos;

DROP POLICY IF EXISTS "familia_gastos_fixos"    ON gastos_fixos;
DROP POLICY IF EXISTS "familia_gastos_variados" ON gastos_variados;
DROP POLICY IF EXISTS "familia_entradas"        ON entradas;
DROP POLICY IF EXISTS "familia_movimentacoes"   ON movimentacoes;
DROP POLICY IF EXISTS "familia_parcelamentos"   ON parcelamentos;

CREATE POLICY "familia_gastos_fixos" ON gastos_fixos FOR ALL
  USING (user_id IN (SELECT public.ids_da_familia()))
  WITH CHECK (user_id IN (SELECT public.ids_da_familia()));
CREATE POLICY "familia_gastos_variados" ON gastos_variados FOR ALL
  USING (user_id IN (SELECT public.ids_da_familia()))
  WITH CHECK (user_id IN (SELECT public.ids_da_familia()));
CREATE POLICY "familia_entradas" ON entradas FOR ALL
  USING (user_id IN (SELECT public.ids_da_familia()))
  WITH CHECK (user_id IN (SELECT public.ids_da_familia()));
CREATE POLICY "familia_movimentacoes" ON movimentacoes FOR ALL
  USING (user_id IN (SELECT public.ids_da_familia()))
  WITH CHECK (user_id IN (SELECT public.ids_da_familia()));
CREATE POLICY "familia_parcelamentos" ON parcelamentos FOR ALL
  USING (user_id IN (SELECT public.ids_da_familia()))
  WITH CHECK (user_id IN (SELECT public.ids_da_familia()));

-- -----------------------------------------------------------------------------
-- 3. Contas e transações
-- -----------------------------------------------------------------------------

-- user_id = dono da conta (de quem é). origem/external_id ficam prontos para o Pluggy.
CREATE TABLE IF NOT EXISTS contas (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome          TEXT NOT NULL DEFAULT '',
  instituicao   TEXT NOT NULL DEFAULT '',
  tipo          TEXT NOT NULL DEFAULT 'corrente'
                CHECK (tipo IN ('corrente','poupanca','cartao','investimento','carteira','outro')),
  saldo_inicial NUMERIC(14,2) NOT NULL DEFAULT 0,
  arquivada     BOOLEAN NOT NULL DEFAULT FALSE,
  origem        TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual','pluggy')),
  external_id   TEXT,
  ordem         INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- valor com sinal: positivo = entrou dinheiro, negativo = saiu.
-- external_id: identificador do banco (FITID do OFX, id do Pluggy) ou chave
-- calculada na importação de CSV — evita duplicar ao importar o mesmo extrato de novo.
CREATE TABLE IF NOT EXISTS transacoes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conta_id    UUID REFERENCES contas(id) ON DELETE CASCADE NOT NULL,
  data        DATE NOT NULL,
  descricao   TEXT NOT NULL DEFAULT '',
  valor       NUMERIC(14,2) NOT NULL DEFAULT 0,
  categoria   TEXT NOT NULL DEFAULT 'Outros',
  observacao  TEXT NOT NULL DEFAULT '',
  origem      TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual','importacao','pluggy')),
  external_id TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contas_user           ON contas(user_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_conta_data ON transacoes(conta_id, data);
CREATE INDEX IF NOT EXISTS idx_transacoes_user_data  ON transacoes(user_id, data);
-- Índice único "cheio" (não parcial) para o upsert do app conseguir usá-lo em
-- ON CONFLICT. Linhas com external_id NULL (lançamentos manuais) não conflitam.
CREATE UNIQUE INDEX IF NOT EXISTS uq_transacoes_conta_external
  ON transacoes(conta_id, external_id);

ALTER TABLE contas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "familia_contas" ON contas;
CREATE POLICY "familia_contas" ON contas FOR ALL
  USING (user_id IN (SELECT public.ids_da_familia()))
  WITH CHECK (user_id IN (SELECT public.ids_da_familia()));

-- A transação precisa estar numa conta visível para a família.
DROP POLICY IF EXISTS "familia_transacoes" ON transacoes;
CREATE POLICY "familia_transacoes" ON transacoes FOR ALL
  USING (user_id IN (SELECT public.ids_da_familia()))
  WITH CHECK (
    user_id IN (SELECT public.ids_da_familia())
    AND conta_id IN (SELECT id FROM contas)
  );

CREATE OR REPLACE TRIGGER trg_contas_updated_at
  BEFORE UPDATE ON contas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Saldo atual de cada conta = saldo inicial + soma das transações.
-- security_invoker: a view respeita o RLS de quem consulta.
CREATE OR REPLACE VIEW contas_saldo WITH (security_invoker = true) AS
  SELECT c.*,
         c.saldo_inicial + COALESCE(t.total, 0) AS saldo,
         t.ultima_data
    FROM contas c
    LEFT JOIN (
      SELECT conta_id, SUM(valor) AS total, MAX(data) AS ultima_data
        FROM transacoes GROUP BY conta_id
    ) t ON t.conta_id = c.id;
