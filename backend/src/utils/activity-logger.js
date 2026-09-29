/**
 * Utilitário para registrar atividades do sistema
 */

/**
 * Registra uma atividade no sistema
 * @param {Object} [supabaseClient] - Cliente Supabase para interação com o banco de dados (opcional, usa o global por padrão)
 * @param {Object} options - Opções do registro
 * @param {string} options.userId - ID do usuário que realizou a ação
 * @param {string} options.actionType - Tipo de ação (criar, atualizar, excluir, etc)
 * @param {string} options.entityType - Tipo de entidade afetada (usuário, desafio, etc)
 * @param {string} options.entityId - ID da entidade afetada
 * @param {string} options.description - Descrição legível da atividade
 * @param {Object} [options.data] - Dados adicionais no formato JSON
 * @param {string} [options.ipAddress] - Endereço IP do usuário
 * @returns {Promise<Object>} - Resultado da operação
 */
async function logActivity(supabaseClient, {
  userId,
  actionType,
  entityType,
  entityId,
  description,
  data = null,
  ipAddress = null
}) {
  try {
    console.log(`Registrando atividade: ${actionType} - ${entityType} - ${description}`);

    // Se nenhum cliente for fornecido, tenta usar o melhor disponível
    let client = supabaseClient;
    
    if (!client) {
      // Tenta usar o Admin primeiro, depois o cliente normal
      if (global.supabaseAdmin) {
        client = global.supabaseAdmin;
        console.log('Usando cliente Admin global para registrar atividade');
      } else if (global.supabase) {
        client = global.supabase;
        console.log('Usando cliente normal global para registrar atividade');
      }
    }
    
    if (!client) {
      console.error('Nenhum cliente Supabase disponível para registrar atividade');
      return { success: false, error: 'Nenhum cliente Supabase disponível' };
    }

    // Inserir diretamente na tabela em vez de usar a função RPC
    const { data: insertResult, error: insertError } = await client
      .from('system_activity_logs')
      .insert({
        user_id: userId,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        description,
        data,
        ip_address: ipAddress
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Erro ao registrar atividade:', insertError);
      return { success: false, error: insertError };
    }

    console.log(`Log de atividade registrado com sucesso, ID: ${insertResult.id}`);
    return { success: true, id: insertResult.id };
  } catch (error) {
    console.error('Exceção ao registrar atividade:', error);
    return { success: false, error };
  }
}

/**
 * Tipos de ações comuns no sistema
 */
const ActionTypes = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  PAYMENT: 'payment',
  WITHDRAW: 'withdraw',
  JOIN: 'join',
  PROGRESS: 'progress',
  ADMIN_ACTION: 'admin_action',
  SYSTEM: 'system'
};

/**
 * Tipos de entidades no sistema
 */
const EntityTypes = {
  USER: 'user',
  CHALLENGE: 'challenge',
  PAYMENT: 'payment',
  TRANSACTION: 'transaction',
  WITHDRAW: 'withdraw',
  PROGRESS: 'progress',
  SYSTEM: 'system'
};

module.exports = {
  logActivity,
  ActionTypes,
  EntityTypes
}; 