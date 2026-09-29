const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { logActivity, ActionTypes, EntityTypes } = require('../utils/activity-logger');

// Configuração do Mercado Pago
const client = new MercadoPagoConfig({ 
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN 
});

// Obter saldo e histórico de transações
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const { data: credits, error: creditsError } = await global.supabase
      .from('users_credits')
      .select('saldo')
      .eq('user_id', req.user.userId)
      .single();

    if (creditsError) throw creditsError;

    const { data: transactions, error: transactionsError } = await global.supabase
      .from('transactions')
      .select('*')
      .eq('user_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (transactionsError) throw transactionsError;

    res.json({
      saldo: credits?.saldo || 0,
      transactions: transactions || []
    });
  } catch (error) {
    console.error('Erro ao buscar saldo:', error);
    res.status(500).json({ message: 'Erro ao buscar saldo' });
  }
});

// Criar link de pagamento Mercado Pago
router.post('/add', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valor inválido' });
    }

    const preference = new Preference(client);
    const preferenceData = {
      items: [{
        title: 'Créditos DietBet',
        unit_price: Number(amount),
        quantity: 1,
      }],
      back_urls: {
        success: `${process.env.FRONTEND_URL}/wallet/success`,
        failure: `${process.env.FRONTEND_URL}/wallet/failure`,
        pending: `${process.env.FRONTEND_URL}/wallet/pending`
      },
      auto_return: 'approved',
      external_reference: `${req.user.userId}`,
      notification_url: `${process.env.BACKEND_URL}/api/credits/webhook`
    };

    const response = await preference.create({ body: preferenceData });
    res.json(response);
  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    res.status(500).json({ message: 'Erro ao criar pagamento' });
  }
});

// Webhook do Mercado Pago
router.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type === 'payment') {
      const payment = await new Payment(client).get({ id: data.id });
      const userId = payment.external_reference;
      const status = payment.status;

      if (status === 'approved') {
        const { error } = await global.supabase.rpc('add_credits', {
          p_user_id: userId,
          p_valor: payment.transaction_amount,
          p_external_id: payment.id.toString(),
          p_description: 'Compra de créditos via Mercado Pago'
        });

        if (error) throw error;
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.sendStatus(500);
  }
});

// Solicitar saque
router.post('/withdraw', authMiddleware, async (req, res) => {
  try {
    const { amount, pixKey } = req.body;

    if (!amount || amount <= 0 || !pixKey) {
      return res.status(400).json({ message: 'Dados inválidos' });
    }

    const { data, error } = await global.supabase.rpc('request_withdraw', {
      p_user_id: req.user.userId,
      p_valor: amount,
      p_pix_key: pixKey
    });

    if (error) throw error;

    // Registra a atividade de solicitação de saque
    await logActivity(global.supabase, {
      userId: req.user.userId,
      actionType: ActionTypes.WITHDRAW,
      entityType: EntityTypes.WITHDRAW,
      entityId: data.id.toString(),
      description: `Solicitação de saque: R$ ${amount.toFixed(2)}`,
      data: {
        withdrawalId: data.id,
        amount,
        pixKey: pixKey.substring(0, 4) + '****' // Oculta parte da chave PIX por segurança
      },
      ipAddress: req.ip
    });

    res.json(data);
  } catch (error) {
    console.error('Erro ao solicitar saque:', error);
    res.status(500).json({ message: error.message || 'Erro ao solicitar saque' });
  }
});

// Listar saques pendentes (admin)
router.get('/withdrawals/pending', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const { data, error } = await global.supabase
      .from('withdraw_requests')
      .select(`
        *,
        users (
          name,
          email
        )
      `)
      .eq('status', 'pendente')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Erro ao listar saques:', error);
    res.status(500).json({ message: 'Erro ao listar saques' });
  }
});

// Processar saque (admin)
router.post('/withdrawals/:id/process', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['processado', 'rejeitado'].includes(status)) {
      return res.status(400).json({ message: 'Status inválido' });
    }

    const { data: withdraw, error: withdrawError } = await global.supabase
      .from('withdraw_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (withdrawError) throw withdrawError;

    if (status === 'processado') {
      // Debita o saldo
      const { error: debitError } = await global.supabase.rpc('use_credits', {
        p_user_id: withdraw.user_id,
        p_valor: withdraw.valor,
        p_description: 'Saque processado'
      });

      if (debitError) throw debitError;
    }

    // Atualiza o status do saque
    const { error: updateError } = await global.supabase
      .from('withdraw_requests')
      .update({
        status,
        processed_at: new Date().toISOString(),
        processed_by: req.user.userId,
        rejection_reason: rejectionReason
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Registra a atividade de processamento de saque
    await logActivity(global.supabase, {
      userId: req.user.userId,
      actionType: ActionTypes.ADMIN_ACTION,
      entityType: EntityTypes.WITHDRAW,
      entityId: id,
      description: `Saque ${status === 'processado' ? 'processado' : 'rejeitado'} no valor de R$ ${withdraw.valor.toFixed(2)}`,
      data: {
        withdrawalId: id,
        amount: withdraw.valor,
        userId: withdraw.user_id,
        status,
        rejectionReason
      },
      ipAddress: req.ip
    });

    res.json({ message: 'Saque processado com sucesso' });
  } catch (error) {
    console.error('Erro ao processar saque:', error);
    res.status(500).json({ message: error.message || 'Erro ao processar saque' });
  }
});

module.exports = router; 