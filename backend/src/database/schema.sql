-- Habilita a extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cria o schema public se não existir
CREATE SCHEMA IF NOT EXISTS public;

-- Remove políticas existentes
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for service role" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.challenges;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.challenges;
DROP POLICY IF EXISTS "Enable update access for challenge creators" ON public.challenges;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.challenge_participants;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.challenge_participants;
DROP POLICY IF EXISTS "Enable update access for participants" ON public.challenge_participants;
DROP POLICY IF EXISTS "Enable read access for payment owners" ON public.payments;
DROP POLICY IF EXISTS "Enable insert access for payment owners" ON public.payments;

-- Remove tabelas existentes para recriar
DROP TABLE IF EXISTS public.challenge_progress;
DROP TABLE IF EXISTS public.payments;
DROP TABLE IF EXISTS public.challenge_participants;
DROP TABLE IF EXISTS public.challenges;
DROP TABLE IF EXISTS public.users;

-- Cria a tabela de usuários
CREATE TABLE public.users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Cria a tabela de desafios
CREATE TABLE public.challenges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  goal TEXT NOT NULL,
  duration INTEGER NOT NULL,
  bet_amount DECIMAL NOT NULL,
  weight_loss_goal DECIMAL NOT NULL DEFAULT 10,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Cria a tabela de participantes
CREATE TABLE public.challenge_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id),
  user_id UUID NOT NULL REFERENCES public.users(id),
  start_weight DECIMAL,
  final_weight DECIMAL,
  proof_image TEXT,
  status TEXT DEFAULT 'active',
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Cria a tabela de progresso dos desafios
CREATE TABLE public.challenge_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id),
  user_id UUID NOT NULL REFERENCES public.users(id),
  current_weight DECIMAL NOT NULL,
  proof_image TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  feedback TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by_id UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Cria a tabela de comentários
CREATE TABLE IF NOT EXISTS public.challenge_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para melhorar a performance
CREATE INDEX IF NOT EXISTS idx_challenge_comments_challenge_id ON public.challenge_comments(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_comments_user_id ON public.challenge_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_challenge_comments_created_at ON public.challenge_comments(created_at);

-- Habilitando RLS (Row Level Security)
ALTER TABLE public.challenge_comments ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para comentários
CREATE POLICY "Enable read access for all users" 
ON public.challenge_comments FOR SELECT 
USING (true);

CREATE POLICY "Enable insert access for authenticated users" 
ON public.challenge_comments FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update access for comment owners" 
ON public.challenge_comments FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Enable delete access for comment owners" 
ON public.challenge_comments FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger para atualizar o campo updated_at
CREATE TRIGGER update_challenge_comments_updated_at
    BEFORE UPDATE ON public.challenge_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Cria a tabela de pagamentos
CREATE TABLE public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id),
  amount DECIMAL NOT NULL,
  status TEXT NOT NULL,
  stripe_session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Tabela de créditos dos usuários
CREATE TABLE public.users_credits (
    user_id UUID REFERENCES public.users(id) PRIMARY KEY,
    saldo DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de transações
CREATE TABLE public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id),
    valor DECIMAL(10,2) NOT NULL,
    tipo VARCHAR(10) CHECK (tipo IN ('compra', 'uso', 'saque')),
    status VARCHAR(10) CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    external_id VARCHAR(100),
    description TEXT
);

-- Tabela de solicitações de saque
CREATE TABLE public.withdraw_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id),
    valor DECIMAL(10,2) NOT NULL,
    pix_key VARCHAR(255) NOT NULL,
    status VARCHAR(10) CHECK (status IN ('pendente', 'processado', 'rejeitado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES public.users(id),
    rejection_reason TEXT
);

-- Garante que o schema public está acessível
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Garante permissões nas sequências
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Garante permissões nas tabelas
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Habilita RLS apenas para users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Desabilita RLS para as outras tabelas
ALTER TABLE public.challenges DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;

-- Garante permissões específicas para todas as tabelas
GRANT SELECT, INSERT, UPDATE ON public.challenges TO authenticated;
GRANT SELECT ON public.challenges TO anon;

GRANT SELECT, INSERT, UPDATE ON public.challenge_participants TO authenticated;
GRANT SELECT ON public.challenge_participants TO anon;

GRANT SELECT, INSERT ON public.challenge_progress TO authenticated;
GRANT SELECT, UPDATE ON public.challenge_progress TO authenticated;
GRANT SELECT ON public.challenge_progress TO anon;

GRANT SELECT, INSERT ON public.payments TO authenticated;
GRANT SELECT ON public.payments TO anon;

-- Políticas para users
CREATE POLICY "Enable read access for all users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for service role" ON public.users
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable update own profile" ON public.users
  FOR UPDATE
  USING (auth.uid()::text = id::text OR (
    SELECT is_admin FROM public.users WHERE id = auth.uid()::uuid
  ));

-- Função para criar desafio
CREATE OR REPLACE FUNCTION public.create_challenge(
  p_title TEXT,
  p_goal TEXT,
  p_duration INTEGER,
  p_bet_amount DECIMAL,
  p_weight_loss_goal DECIMAL,
  p_start_date TIMESTAMP WITH TIME ZONE,
  p_end_date TIMESTAMP WITH TIME ZONE,
  p_created_by UUID
) RETURNS public.challenges AS $$
DECLARE
  v_challenge public.challenges;
BEGIN
  INSERT INTO public.challenges (
    title,
    goal,
    duration,
    bet_amount,
    weight_loss_goal,
    start_date,
    end_date,
    created_by,
    status
  ) VALUES (
    p_title,
    p_goal,
    p_duration,
    p_bet_amount,
    p_weight_loss_goal,
    p_start_date,
    p_end_date,
    p_created_by,
    'active'
  )
  RETURNING * INTO v_challenge;

  RETURN v_challenge;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garante permissões na função
GRANT EXECUTE ON FUNCTION public.create_challenge TO authenticated;

-- Trigger para atualizar o timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_credits_updated_at
    BEFORE UPDATE ON public.users_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Função para adicionar créditos
CREATE OR REPLACE FUNCTION add_credits(
    p_user_id UUID,
    p_valor DECIMAL,
    p_external_id VARCHAR,
    p_description TEXT
) RETURNS public.users_credits AS $$
DECLARE
    v_credits public.users_credits;
BEGIN
    -- Insere ou atualiza o saldo
    INSERT INTO public.users_credits (user_id, saldo)
    VALUES (p_user_id, p_valor)
    ON CONFLICT (user_id) DO UPDATE
    SET saldo = public.users_credits.saldo + p_valor
    RETURNING * INTO v_credits;

    -- Registra a transação
    INSERT INTO public.transactions (user_id, valor, tipo, status, external_id, description)
    VALUES (p_user_id, p_valor, 'compra', 'aprovado', p_external_id, p_description);

    RETURN v_credits;
END;
$$ LANGUAGE plpgsql;

-- Função para usar créditos
CREATE OR REPLACE FUNCTION use_credits(
    p_user_id UUID,
    p_valor DECIMAL,
    p_description TEXT
) RETURNS public.users_credits AS $$
DECLARE
    v_credits public.users_credits;
BEGIN
    -- Verifica se tem saldo suficiente
    IF NOT EXISTS (
        SELECT 1 FROM public.users_credits
        WHERE user_id = p_user_id AND saldo >= p_valor
    ) THEN
        RAISE EXCEPTION 'Saldo insuficiente';
    END IF;

    -- Atualiza o saldo
    UPDATE public.users_credits
    SET saldo = saldo - p_valor
    WHERE user_id = p_user_id
    RETURNING * INTO v_credits;

    -- Registra a transação
    INSERT INTO public.transactions (user_id, valor, tipo, status, description)
    VALUES (p_user_id, p_valor, 'uso', 'aprovado', p_description);

    RETURN v_credits;
END;
$$ LANGUAGE plpgsql;

-- Função para solicitar saque
CREATE OR REPLACE FUNCTION request_withdraw(
    p_user_id UUID,
    p_valor DECIMAL,
    p_pix_key VARCHAR
) RETURNS public.withdraw_requests AS $$
DECLARE
    v_withdraw public.withdraw_requests;
BEGIN
    -- Verifica se tem saldo suficiente
    IF NOT EXISTS (
        SELECT 1 FROM public.users_credits
        WHERE user_id = p_user_id AND saldo >= p_valor
    ) THEN
        RAISE EXCEPTION 'Saldo insuficiente';
    END IF;

    -- Registra a solicitação de saque
    INSERT INTO public.withdraw_requests (user_id, valor, pix_key, status)
    VALUES (p_user_id, p_valor, p_pix_key, 'pendente')
    RETURNING * INTO v_withdraw;

    RETURN v_withdraw;
END;
$$ LANGUAGE plpgsql;

-- Permissões
GRANT SELECT, INSERT, UPDATE ON public.users_credits TO authenticated;
GRANT SELECT ON public.users_credits TO anon;

GRANT SELECT, INSERT ON public.transactions TO authenticated;
GRANT SELECT ON public.transactions TO anon;

GRANT SELECT, INSERT ON public.withdraw_requests TO authenticated;
GRANT SELECT, UPDATE ON public.withdraw_requests TO authenticated;
GRANT SELECT ON public.withdraw_requests TO anon; 