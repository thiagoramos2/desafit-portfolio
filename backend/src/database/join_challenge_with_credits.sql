-- Função para debitar créditos ao participar de um desafio
CREATE OR REPLACE FUNCTION join_challenge_with_credits(
    p_user_id UUID,
    p_challenge_id UUID,
    p_start_weight DECIMAL
) RETURNS JSONB AS $$
DECLARE
    v_challenge RECORD;
    v_credits RECORD;
    v_transaction_id UUID;
    v_participant_id UUID;
    v_valor DECIMAL;
    v_result JSONB;
BEGIN
    -- Buscar informações do desafio
    SELECT * INTO v_challenge
    FROM challenges
    WHERE id = p_challenge_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Desafio não encontrado'
        );
    END IF;
    
    -- Verificar se o usuário já está participando
    IF EXISTS (
        SELECT 1 FROM challenge_participants 
        WHERE user_id = p_user_id AND challenge_id = p_challenge_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Usuário já está participando deste desafio'
        );
    END IF;
    
    -- Obter o saldo do usuário
    SELECT * INTO v_credits
    FROM users_credits
    WHERE user_id = p_user_id;
    
    -- Verificar se o usuário tem créditos suficientes
    IF v_credits IS NULL OR v_credits.saldo < v_challenge.bet_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Saldo insuficiente para participar deste desafio'
        );
    END IF;
    
    -- Criar a transação dentro de um bloco para garantir atomicidade
    BEGIN
        -- 1. Deduzir o valor do saldo do usuário
        UPDATE users_credits
        SET saldo = saldo - v_challenge.bet_amount
        WHERE user_id = p_user_id
        RETURNING saldo INTO v_valor;
        
        -- 2. Registrar a transação
        INSERT INTO transactions (
            user_id, 
            valor, 
            tipo, 
            status, 
            external_id, 
            description
        )
        VALUES (
            p_user_id, 
            v_challenge.bet_amount, 
            'uso', 
            'aprovado', 
            'challenge-' || p_challenge_id, 
            'Participação no desafio: ' || v_challenge.title
        )
        RETURNING id INTO v_transaction_id;
        
        -- 3. Adicionar o usuário como participante do desafio
        INSERT INTO challenge_participants (
            challenge_id,
            user_id,
            start_weight,
            status,
            payment_status
        )
        VALUES (
            p_challenge_id,
            p_user_id,
            p_start_weight,
            'active',
            'completed'
        )
        RETURNING id INTO v_participant_id;
        
        v_result := jsonb_build_object(
            'success', true,
            'message', 'Participação confirmada e ' || v_challenge.bet_amount || ' créditos debitados',
            'participant_id', v_participant_id,
            'transaction_id', v_transaction_id,
            'new_balance', v_valor
        );
        
        RETURN v_result;
    EXCEPTION WHEN OTHERS THEN
        -- Em caso de erro, desfaz todas as operações
        RAISE;
    END;
END;
$$ LANGUAGE plpgsql;

-- Garante permissões na função
GRANT EXECUTE ON FUNCTION join_challenge_with_credits TO authenticated, service_role; 