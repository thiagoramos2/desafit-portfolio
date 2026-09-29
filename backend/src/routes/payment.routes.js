const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const authMiddleware = require('../middleware/auth.middleware');
const { logActivity, ActionTypes, EntityTypes } = require('../utils/activity-logger');

// Não criar um novo cliente, usar o global
// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Criar sessão de pagamento para participar de um desafio (versão simplificada sem Stripe)
router.post('/create-session', authMiddleware, async (req, res) => {
  try {
    const { challengeId } = req.body;
    const userId = req.user.userId;

    // Verifica se o cliente global está disponível
    if (!global.supabase) {
      console.error('Cliente global do Supabase não está disponível');
      return res.status(500).json({ message: 'Erro de configuração do servidor' });
    }

    // Busca informações do desafio
    const { data: challenge } = await global.supabase
      .from('challenges')
      .select()
      .eq('id', challengeId)
      .single();

    if (!challenge) {
      return res.status(404).json({ message: 'Desafio não encontrado' });
    }

    // Verifica se o usuário já está participando
    const { data: existingParticipant } = await global.supabase
      .from('challenge_participants')
      .select()
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)
      .single();

    if (existingParticipant) {
      return res.status(400).json({ message: 'Você já está participando deste desafio' });
    }

    // Adiciona o participante diretamente
    const { data: participant, error: participantError } = await global.supabase
      .from('challenge_participants')
      .insert([{
        challenge_id: challengeId,
        user_id: userId,
        status: 'active',
        payment_status: 'completed' // Marca como pago automaticamente
      }])
      .select()
      .single();

    if (participantError) {
      throw participantError;
    }

    // Registra o "pagamento" (para manter consistência nos dados)
    const { error: paymentError } = await global.supabase
      .from('payments')
      .insert([{
        user_id: userId,
        challenge_id: challengeId,
        amount: challenge.bet_amount,
        status: 'completed',
        stripe_session_id: 'DEMO_MODE'
      }]);

    if (paymentError) {
      throw paymentError;
    }

    // Registra a atividade de pagamento
    await logActivity(global.supabase, {
      userId,
      actionType: ActionTypes.PAYMENT,
      entityType: EntityTypes.CHALLENGE,
      entityId: challengeId,
      description: `Pagamento realizado para participação no desafio: ${challenge.title}`,
      data: {
        challengeId,
        amount: challenge.bet_amount,
        participantId: participant.id
      },
      ipAddress: req.ip
    });

    res.json({ 
      message: 'Participação confirmada com sucesso',
      participant
    });
  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    res.status(500).json({ message: 'Erro ao processar pagamento', error: error.message });
  }
});

// Webhook do Stripe para processar pagamentos bem-sucedidos
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Processa o evento de pagamento bem-sucedido
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { challengeId, userId } = session.metadata;

    try {
      // Registra o pagamento
      const { error: paymentError } = await global.supabase
        .from('payments')
        .insert([{
          user_id: userId,
          challenge_id: challengeId,
          amount: session.amount_total / 100,
          status: 'completed',
          stripe_session_id: session.id
        }]);

      if (paymentError) throw paymentError;

      // Atualiza o status do participante
      const { error: participantError } = await global.supabase
        .from('challenge_participants')
        .update({ payment_status: 'paid' })
        .eq('challenge_id', challengeId)
        .eq('user_id', userId);

      if (participantError) throw participantError;
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      return res.status(500).end();
    }
  }

  res.json({ received: true });
});

// Solicitar saque de prêmio
router.post('/withdraw', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.userId;

    // Verifica o saldo disponível do usuário
    const { data: userBalance } = await global.supabase
      .rpc('get_user_balance', { user_id: userId });

    if (!userBalance || userBalance < amount) {
      return res.status(400).json({ message: 'Saldo insuficiente' });
    }

    // Cria transferência no Stripe Connect (requer conta Connect configurada)
    const transfer = await stripe.transfers.create({
      amount: amount * 100,
      currency: 'brl',
      destination: req.user.stripeAccountId, // Requer que o usuário tenha uma conta Stripe Connect
    });

    // Registra o saque
    const { error } = await global.supabase
      .from('withdrawals')
      .insert([{
        user_id: userId,
        amount,
        status: 'completed',
        stripe_transfer_id: transfer.id
      }]);

    if (error) throw error;

    res.json({ message: 'Saque solicitado com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao processar saque' });
  }
});

module.exports = router; 