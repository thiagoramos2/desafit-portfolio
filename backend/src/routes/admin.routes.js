const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const { logActivity, ActionTypes, EntityTypes } = require('../utils/activity-logger');

// Não criar um novo cliente, usar o global
// const supabase = createClient(
//   process.env.SUPABASE_URL, 
//   process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.replace(/[\r\n\s]+/g, '') : ''
// );

// Middleware para todas as rotas admin
router.use(authMiddleware);
router.use(adminMiddleware);

// Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    // Verificar se o cliente global está disponível
    if (!global.supabaseAdmin && !global.supabase) {
      console.error('ERRO CRÍTICO: Nenhum cliente Supabase está disponível!');
      return res.status(500).json({
        message: 'Erro de configuração do servidor',
        details: 'Serviço temporariamente indisponível. Tente novamente mais tarde.'
      });
    }
    
    // Escolher o cliente disponível, preferindo o Admin
    const client = global.supabaseAdmin || global.supabase;
    console.log(`Usando cliente ${global.supabaseAdmin ? 'Admin' : 'Normal'} para dashboard admin`);
    
    // Busca total de usuários
    const { count: totalUsers, error: usersError } = await client
      .from('users')
      .select('*', { count: 'exact', head: true });
      
    if (usersError) {
      console.error('Erro ao buscar total de usuários:', usersError);
      throw usersError;
    }

    // Busca total de desafios
    const { count: totalChallenges, error: challengesError } = await client
      .from('challenges')
      .select('*', { count: 'exact', head: true });
      
    if (challengesError) {
      console.error('Erro ao buscar total de desafios:', challengesError);
      throw challengesError;
    }

    // Busca total de participantes
    const { count: totalParticipants } = await client
      .from('challenge_participants')
      .select('*', { count: 'exact', head: true });

    // Busca total de pagamentos
    const { data: payments } = await client
      .from('payments')
      .select('amount')
      .eq('status', 'completed');

    // Busca total de depósitos
    const { data: deposits, error: depositsError } = await client
      .from('transactions')
      .select('*')
      .eq('tipo', 'compra')
      .eq('status', 'aprovado');

    if (depositsError) {
      console.error('Erro ao buscar depósitos:', depositsError);
    }

    // Busca total de saques
    const { data: withdrawals, error: withdrawalsError } = await client
      .from('transactions')
      .select('*')
      .eq('tipo', 'saque')
      .eq('status', 'aprovado');

    if (withdrawalsError) {
      console.error('Erro ao buscar saques:', withdrawalsError);
    }

    // Log para debug
    console.log('Depósitos encontrados:', JSON.stringify(deposits, null, 2));
    console.log('Saques encontrados:', JSON.stringify(withdrawals, null, 2));

    const totalRevenue = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    const totalDeposits = deposits?.reduce((sum, deposit) => sum + parseFloat(deposit.valor || 0), 0) || 0;
    const totalWithdrawn = withdrawals?.reduce((sum, withdrawal) => sum + parseFloat(withdrawal.valor || 0), 0) || 0;

    console.log('Total de depósitos calculado:', totalDeposits);
    console.log('Total de saques calculado:', totalWithdrawn);

    res.json({
      totalUsers,
      totalChallenges,
      totalParticipants,
      totalRevenue,
      totalDeposits,
      totalWithdrawn
    });

    // Registra a atividade de acesso ao dashboard
    await logActivity(client, {
      userId: req.user.userId,
      actionType: ActionTypes.ADMIN_ACTION,
      entityType: EntityTypes.SYSTEM,
      entityId: null,
      description: 'Administrador acessou o dashboard',
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ message: 'Erro ao buscar estatísticas' });
  }
});

// Usuários
router.get('/users', async (req, res) => {
  try {
    // Versão alternativa usando join
    const { data, error } = await global.supabaseAdmin
      .rpc('get_users_with_balance');

    if (error) {
      console.error('Erro na função RPC:', error);
      
      // Fallback: busca manual com join
      const { data: users, error: usersError } = await global.supabase
        .from('users')
        .select('*');
        
      if (usersError) {
        throw usersError;
      }
      
      // Busca todos os saldos
      const { data: credits, error: creditsError } = await global.supabase
        .from('users_credits')
        .select('*');
        
      if (creditsError) {
        throw creditsError;
      }
      
      // Criar um mapa de user_id -> saldo
      const balanceMap = {};
      credits.forEach(credit => {
        balanceMap[credit.user_id] = parseFloat(credit.saldo || 0);
      });
      
      // Adicionar o saldo a cada usuário
      const processedUsers = users.map(user => ({
        ...user,
        saldo: balanceMap[user.id] || 0
      }));
      
      console.log('Usuários processados (fallback):', JSON.stringify(processedUsers, null, 2));
      return res.json(processedUsers);
    }
    
    console.log('Usuários com saldos (RPC):', JSON.stringify(data, null, 2));
    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// Atualiza um usuário
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, is_admin, is_active } = req.body;

    // Verifica se o usuário existe antes de atualizar
    const { data: existingUser, error: checkError } = await global.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError) {
      console.error('Erro ao verificar usuário:', checkError);
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Atualiza o usuário
    const { data: updatedUser, error: updateError } = await global.supabase
      .from('users')
      .update({
        name: name || existingUser.name,
        email: email || existingUser.email,
        is_admin: typeof is_admin === 'boolean' ? is_admin : existingUser.is_admin,
        is_active: typeof is_active === 'boolean' ? is_active : existingUser.is_active
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar usuário:', updateError);
      return res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Adiciona saldo manualmente para um usuário (apenas admin)
router.post('/users/:id/add-balance', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    // Verifica se o usuário existe
    const { data: user, error: userError } = await global.supabase
      .from('users')
      .select('name')
      .eq('id', id)
      .single();

    if (userError) {
      console.error('Erro ao verificar usuário:', userError);
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Gera um ID de transação único
    const transactionId = `admin-credit-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Usa a função add_credits para adicionar o saldo
    const { data, error } = await global.supabase.rpc('add_credits', { 
      p_user_id: id,
      p_valor: parseFloat(amount),
      p_external_id: transactionId,
      p_description: description || `Crédito adicionado manualmente por ${req.user.email}`
    });

    if (error) {
      console.error('Erro ao adicionar créditos:', error);
      return res.status(500).json({ error: 'Erro ao adicionar créditos' });
    }

    // Registra a ação no log
    console.log(`Admin ${req.user.email} adicionou R$ ${amount} para o usuário ${user.name} (${id})`);

    res.json({ 
      success: true, 
      message: `Saldo de R$ ${parseFloat(amount).toFixed(2)} adicionado com sucesso`,
      transaction: {
        id: transactionId,
        amount: parseFloat(amount),
        user_id: id,
        created_at: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Erro ao adicionar saldo:', error);
    res.status(500).json({ error: 'Erro interno ao adicionar saldo' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await global.supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ message: 'Erro ao excluir usuário' });
  }
});

// Desafios
router.get('/challenges', async (req, res) => {
  try {
    const { data: challenges, error } = await global.supabaseAdmin
      .from('challenges')
      .select(`
        *,
        created_by (
          name,
          email
        ),
        participants:challenge_participants (
          user_id,
          status
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(challenges);
  } catch (error) {
    console.error('Erro ao listar desafios:', error);
    res.status(500).json({ message: 'Erro ao listar desafios' });
  }
});

router.delete('/challenges/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Primeiro exclui os participantes
    await global.supabaseAdmin
      .from('challenge_participants')
      .delete()
      .eq('challenge_id', id);

    // Depois exclui o desafio
    const { error } = await global.supabaseAdmin
      .from('challenges')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Desafio excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir desafio:', error);
    res.status(500).json({ message: 'Erro ao excluir desafio' });
  }
});

// Logs de atividade do sistema
router.get('/activity-logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, entity_type, action_type, user_id, start_date, end_date } = req.query;
    
    // Usa o cliente global Supabase
    const client = global.supabaseAdmin || global.supabase;
    
    if (!client) {
      console.error('Nenhum cliente Supabase disponível');
      return res.status(500).json({
        message: 'Erro de configuração do servidor',
        details: 'Serviço temporariamente indisponível. Tente novamente mais tarde.'
      });
    }
    
    // Inicia a query
    let query = client
      .from('system_activity_logs')
      .select(`
        *,
        users:user_id (
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });
    
    // Aplica filtros
    if (entity_type) {
      query = query.eq('entity_type', entity_type);
    }
    
    if (action_type) {
      query = query.eq('action_type', action_type);
    }
    
    if (user_id) {
      query = query.eq('user_id', user_id);
    }
    
    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    
    if (end_date) {
      query = query.lte('created_at', end_date);
    }
    
    // Calcula paginação
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    // Executa a query com paginação
    const { data: logs, error, count } = await query
      .range(from, to)
      .limit(limit);
    
    if (error) {
      throw error;
    }
    
    // Total de registros para esta query (sem paginação)
    const { count: totalCount, error: countError } = await client
      .from('system_activity_logs')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      throw countError;
    }
    
    // Formata os resultados
    const formattedLogs = logs.map(log => ({
      ...log,
      user: log.users ? {
        id: log.users.id,
        name: log.users.name,
        email: log.users.email
      } : null
    }));
    
    // Remove campos desnecessários
    formattedLogs.forEach(log => delete log.users);
    
    // Responde com os logs e metadados de paginação
    res.json({
      logs: formattedLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
    
    // Registra a visualização dos logs
    await logActivity(client, {
      userId: req.user.userId,
      actionType: ActionTypes.ADMIN_ACTION,
      entityType: EntityTypes.SYSTEM,
      entityId: null,
      description: 'Administrador visualizou logs de atividade',
      data: { filters: { entity_type, action_type, user_id, start_date, end_date } },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Erro ao obter logs de atividade:', error);
    res.status(500).json({ message: 'Erro ao obter logs de atividade do sistema' });
  }
});

// Marcar logs como visualizados
router.post('/activity-logs/mark-viewed', async (req, res) => {
  try {
    const { log_ids } = req.body;
    
    if (!log_ids || !Array.isArray(log_ids) || log_ids.length === 0) {
      return res.status(400).json({ message: 'IDs de logs inválidos' });
    }
    
    // Usa apenas o cliente global do Supabase
    const supabaseClient = global.supabaseAdmin || global.supabase;
    
    if (!supabaseClient) {
      console.error('Nenhum cliente Supabase disponível');
      return res.status(500).json({
        message: 'Erro de configuração do servidor',
        details: 'Serviço temporariamente indisponível. Tente novamente mais tarde.'
      });
    }
    
    // Atualiza os logs
    const { error } = await supabaseClient
      .from('system_activity_logs')
      .update({ admin_viewed: true })
      .in('id', log_ids);
    
    if (error) {
      throw error;
    }
    
    res.json({ message: 'Logs marcados como visualizados com sucesso' });
    
    // Registra a atividade
    await logActivity(supabaseClient, {
      userId: req.user.userId,
      actionType: ActionTypes.UPDATE,
      entityType: EntityTypes.SYSTEM,
      entityId: null,
      description: `Administrador marcou ${log_ids.length} logs como visualizados`,
      data: { log_ids },
      ipAddress: req.ip
    });
  } catch (error) {
    console.error('Erro ao marcar logs como visualizados:', error);
    res.status(500).json({ message: 'Erro ao atualizar status dos logs' });
  }
});

module.exports = router; 