-- Criação da tabela de logs de atividades do sistema
CREATE TABLE IF NOT EXISTS public.system_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    description TEXT,
    data JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    admin_viewed BOOLEAN DEFAULT FALSE
);

-- Criar índices para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS idx_system_activity_logs_user_id ON public.system_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_activity_logs_action_type ON public.system_activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_system_activity_logs_entity_type ON public.system_activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_system_activity_logs_created_at ON public.system_activity_logs(created_at);

-- Comentários das colunas
COMMENT ON TABLE public.system_activity_logs IS 'Registros de todas as atividades importantes realizadas no sistema';
COMMENT ON COLUMN public.system_activity_logs.id IS 'Identificador único do registro';
COMMENT ON COLUMN public.system_activity_logs.user_id IS 'ID do usuário que realizou a ação';
COMMENT ON COLUMN public.system_activity_logs.action_type IS 'Tipo de ação (criar, atualizar, excluir, etc)';
COMMENT ON COLUMN public.system_activity_logs.entity_type IS 'Tipo de entidade afetada (usuário, desafio, etc)';
COMMENT ON COLUMN public.system_activity_logs.entity_id IS 'ID da entidade afetada';
COMMENT ON COLUMN public.system_activity_logs.description IS 'Descrição legível da atividade';
COMMENT ON COLUMN public.system_activity_logs.data IS 'Dados adicionais no formato JSON';
COMMENT ON COLUMN public.system_activity_logs.ip_address IS 'Endereço IP do usuário';
COMMENT ON COLUMN public.system_activity_logs.created_at IS 'Data e hora do registro';
COMMENT ON COLUMN public.system_activity_logs.admin_viewed IS 'Indica se o registro foi visualizado por um administrador';

-- Função para registrar atividade no sistema
CREATE OR REPLACE FUNCTION log_system_activity(
    p_user_id UUID,
    p_action_type VARCHAR,
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_description TEXT,
    p_data JSONB DEFAULT NULL,
    p_ip_address VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.system_activity_logs (
        user_id,
        action_type,
        entity_type,
        entity_id,
        description,
        data,
        ip_address
    ) VALUES (
        p_user_id,
        p_action_type,
        p_entity_type,
        p_entity_id,
        p_description,
        p_data,
        p_ip_address
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Garante permissões na função
GRANT EXECUTE ON FUNCTION log_system_activity TO authenticated, service_role; 