const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const authMiddleware = require('../middleware/auth.middleware');
const { z } = require('zod');
const multer = require('multer');
const fetch = require('node-fetch');
const { logActivity, ActionTypes, EntityTypes } = require('../utils/activity-logger');
const { uploadToS3, getS3PublicUrl } = require('../utils/s3.utils');

// Configuração do multer
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

const adminMiddleware = require('../middleware/admin.middleware');

// Não criar um novo cliente, usar o global
// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Schema de validação para criação de desafio
const challengeSchema = z.object({
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres'),
  goal: z.string().min(5, 'Meta deve ter no mínimo 5 caracteres'),
  duration: z.number().min(7, 'Duração mínima de 7 dias'),
  bet_amount: z.number().min(10, 'Valor mínimo da aposta é R$ 10'),
  weight_loss_goal: z.number().min(5, 'Meta mínima é 5%').max(30, 'Meta máxima é 30%'),
  start_date: z.string().transform(str => {
    const date = new Date(str);
    if (isNaN(date.getTime())) {
      throw new Error('Data de início inválida');
    }
    return date;
  })
});

// Criar um novo desafio
router.post('/', authMiddleware, async (req, res) => {
  try {
    console.log('Recebendo requisição para criar desafio:', req.body);
    console.log('Usuário autenticado:', req.user);
    
    const data = challengeSchema.parse(req.body);
    
    // Calcula a data final baseada na data de início e duração
    const end_date = new Date(data.start_date);
    end_date.setDate(end_date.getDate() + data.duration);

    // Formata as datas para ISO string
    const formattedStartDate = data.start_date.toISOString();
    const formattedEndDate = end_date.toISOString();
    
    console.log('Datas calculadas:', {
      start_date: formattedStartDate,
      end_date: formattedEndDate
    });
    
    // Usando o cliente global Supabase Admin
    if (!global.supabaseAdmin) {
      console.error('Cliente supabaseAdmin global não está disponível!');
      return res.status(500).json({
        message: 'Erro de configuração do servidor',
        details: 'Cliente Supabase Admin não está inicializado'
      });
    }
    
    // Força uma atualização do cache do schema
    await global.supabaseAdmin.rpc('reload_schema_cache');
    
    // Primeiro, vamos verificar se conseguimos acessar a tabela
    console.log('Verificando acesso à tabela challenges...');
    const { data: tableCheck, error: tableError } = await global.supabaseAdmin
      .from('challenges')
      .select('*')
      .limit(1);
      
    if (tableError) {
      console.error('Erro ao verificar tabela:', tableError);
      throw tableError;
    }
    
    console.log('Acesso à tabela ok, tentando inserir...');
    
    // Insere o desafio usando SQL bruto
    const { data: challenge, error } = await global.supabaseAdmin
      .from('challenges')
      .insert({
        title: data.title,
        goal: data.goal,
        duration: data.duration,
        bet_amount: data.bet_amount,
        weight_loss_goal: data.weight_loss_goal,
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        created_by: req.user.userId,
        status: 'active'
      })
      .select('*, created_by(id, name, email)')
      .single();

    if (error) {
      console.error('Erro ao inserir no Supabase:', error);
      
      // Tenta inserir usando SQL bruto se o primeiro método falhar
      const { data: rawChallenge, error: rawError } = await global.supabaseAdmin.rpc(
        'create_challenge',
        {
          p_title: data.title,
          p_goal: data.goal,
          p_duration: data.duration,
          p_bet_amount: data.bet_amount,
          p_weight_loss_goal: data.weight_loss_goal,
          p_start_date: formattedStartDate,
          p_end_date: formattedEndDate,
          p_created_by: req.user.userId
        }
      );

      if (rawError) {
        console.error('Erro ao inserir usando SQL bruto:', rawError);
        throw rawError;
      }

      challenge = rawChallenge;
    }

    console.log('Desafio criado com sucesso:', challenge);

    // Registra a atividade de criação de desafio
    await logActivity(global.supabaseAdmin, {
      userId: req.user.userId,
      actionType: ActionTypes.CREATE,
      entityType: EntityTypes.CHALLENGE,
      entityId: challenge.id,
      description: `Desafio criado: ${data.title}`,
      data: {
        challengeId: challenge.id,
        title: data.title,
        goal: data.goal,
        duration: data.duration,
        betAmount: data.bet_amount,
        weightLossGoal: data.weight_loss_goal,
        startDate: formattedStartDate,
        endDate: formattedEndDate
      },
      ipAddress: req.ip
    });

    res.status(201).json({
      message: 'Desafio criado com sucesso',
      challenge
    });
  } catch (error) {
    console.error('Erro detalhado ao criar desafio:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Dados inválidos',
        errors: error.errors 
      });
    }
    
    if (error.code === 'PGRST301') {
      return res.status(403).json({ 
        message: 'Sem permissão para criar desafio',
        details: 'Verifique se você está autenticado corretamente'
      });
    }

    if (error.code === 'PGRST204') {
      return res.status(500).json({ 
        message: 'Erro de configuração no banco de dados',
        details: 'A estrutura da tabela pode estar incorreta'
      });
    }
    
    res.status(500).json({ 
      message: 'Erro ao criar desafio',
      error: error.message,
      details: error.details || error.hint || 'Tente novamente em alguns minutos'
    });
  }
});

// Listar desafios disponíveis
router.get('/', async (req, res) => {
  try {
    console.log('Listando desafios disponíveis');
    
    // Verificar se temos ao menos um cliente disponível
    if (!global.supabaseAdmin && !global.supabase) {
      console.error('ERRO CRÍTICO: Nenhum cliente Supabase está disponível!');
      return res.status(500).json({
        message: 'Erro de configuração do servidor',
        details: 'Serviço temporariamente indisponível. Tente novamente mais tarde.'
      });
    }
    
    // Escolher o cliente disponível, preferindo o Admin
    const client = global.supabaseAdmin || global.supabase;
    console.log(`Usando cliente ${global.supabaseAdmin ? 'Admin' : 'Normal'} para listar desafios`);
    
    let { data: challenges, error } = await client
      .from('challenges')
      .select(`
        *,
        created_by (
          id,
          name,
          email
        ),
        participants:challenge_participants (
          id,
          user_id,
          status,
          payment_status,
          user:user_id (
            id,
            name,
            email
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao listar desafios:', error);
      
      // Se temos dois clientes e um falhou, tente o outro
      if (global.supabaseAdmin && global.supabase && client === global.supabaseAdmin) {
        console.log('Tentando cliente alternativo...');
        const { data: backupChallenges, error: backupError } = await global.supabase
          .from('challenges')
          .select(`
            *,
            created_by (
              id,
              name,
              email
            ),
            participants:challenge_participants (
              id,
              user_id,
              status,
              payment_status,
              user:user_id (
                id,
                name,
                email
              )
            )
          `)
          .order('created_at', { ascending: false });
          
        if (backupError) {
          console.error('Erro também com cliente backup:', backupError);
          throw backupError;
        }
        
        challenges = backupChallenges;
      } else {
        throw error;
      }
    }

    // Formata a resposta para incluir a contagem de participantes
    const formattedChallenges = challenges.map(challenge => ({
      ...challenge,
      participants: challenge.participants ? challenge.participants.map(p => ({
        ...p,
        name: p.user?.name,
        email: p.user?.email
      })) : [], // Garante que participants seja sempre um array
      participants_count: challenge.participants ? challenge.participants.length : 0
    }));

    console.log('Desafios encontrados:', formattedChallenges.length);
    res.json(formattedChallenges);
  } catch (error) {
    console.error('Erro ao listar desafios:', error);
    res.status(500).json({ 
      message: 'Erro ao listar desafios',
      error: error.message 
    });
  }
});

// Obter detalhes de um desafio
router.get('/:id', async (req, res) => {
  try {
    console.log('Buscando detalhes do desafio:', req.params.id);

    // Verificar se temos ao menos um cliente disponível
    if (!global.supabaseAdmin && !global.supabase) {
      console.error('ERRO CRÍTICO: Nenhum cliente Supabase está disponível!');
      return res.status(500).json({
        message: 'Erro de configuração do servidor',
        details: 'Serviço temporariamente indisponível. Tente novamente mais tarde.'
      });
    }
    
    // Escolher o cliente disponível, preferindo o Admin
    const client = global.supabaseAdmin || global.supabase;
    console.log(`Usando cliente ${global.supabaseAdmin ? 'Admin' : 'Normal'} para detalhes do desafio`);

    // Busca o desafio com o cliente selecionado
    let { data: challenge, error: challengeError } = await client
      .from('challenges')
      .select(`
        *,
        creator:created_by(id, name, email),
        participants:challenge_participants(
          id,
          user_id,
          start_weight,
          final_weight,
          proof_image,
          status,
          payment_status,
          participant:user_id(name, email)
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (challengeError) {
      console.error('Erro ao buscar desafio:', challengeError);
      
      // Se temos dois clientes e um falhou, tente o outro
      if (global.supabaseAdmin && global.supabase && client === global.supabaseAdmin) {
        console.log('Tentando cliente alternativo para detalhes...');
        const { data: backupChallenge, error: backupError } = await global.supabase
          .from('challenges')
          .select(`
            *,
            creator:created_by(id, name, email),
            participants:challenge_participants(
              id,
              user_id,
              start_weight,
              final_weight,
              proof_image,
              status,
              payment_status,
              participant:user_id(name, email)
            )
          `)
          .eq('id', req.params.id)
          .single();
          
        if (backupError) {
          console.error('Erro também com cliente backup:', backupError);
          throw backupError;
        }
        
        challenge = backupChallenge;
      } else {
        throw challengeError;
      }
    }

    if (!challenge) {
      return res.status(404).json({ message: 'Desafio não encontrado' });
    }

    console.log('Desafio encontrado:', challenge);

    // Formata a resposta
    const formattedChallenge = {
      ...challenge,
      created_by: challenge.creator,
      participants: challenge.participants ? challenge.participants.map(p => ({
        ...p,
        user: p.participant,
        user_name: p.participant?.name || "Participante sem nome"
      })) : []
    };

    // Remove campos desnecessários
    delete formattedChallenge.creator;
    formattedChallenge.participants.forEach(p => delete p.participant);

    res.json(formattedChallenge);
  } catch (error) {
    console.error('Erro ao obter detalhes do desafio:', error);
    res.status(500).json({ 
      message: 'Erro ao obter detalhes do desafio',
      error: error.message
    });
  }
});

// Participar de um desafio
router.post('/:id/join', authMiddleware, upload.single('initialProofImage'), async (req, res) => {
  try {
    const challengeId = req.params.id;
    const userId = req.user.userId;
    const start_weight = req.body.startWeight;
    const proofImage = req.file;

    console.log('Tentando participar do desafio:', {
      challengeId,
      userId,
      start_weight,
      hasProofImage: !!proofImage,
      headers: req.headers
    });

    if (!start_weight) {
      return res.status(400).json({ message: 'Peso inicial é obrigatório' });
    }

    if (!proofImage) {
      return res.status(400).json({ message: 'Foto comprobatória é obrigatória' });
    }

    // Upload da imagem para o S3 Storage
    const fileName = `proof-images/${userId}/${challengeId}/${Date.now()}-${proofImage.originalname}`;
    
    // Declarar a variável publicUrl fora do bloco try/catch
    let publicUrl = null;
    
    try {
      console.log(`Tentando fazer upload para S3: ${fileName}`);
      console.log(`Detalhes do arquivo: ${proofImage.mimetype}, tamanho: ${proofImage.size} bytes`);
      
      // Importar o utilitário S3
      const s3Utils = require('../utils/s3.utils');
      const uploadResult = await s3Utils.uploadToS3(
        proofImage.buffer,
        fileName,
        proofImage.mimetype
      );

      if (!uploadResult.success) {
        console.error('Erro detalhado ao fazer upload da imagem:', uploadResult.error);
        return res.status(500).json({ 
          message: 'Erro ao fazer upload da imagem', 
          error: uploadResult.error,
          details: 'Verifique as permissões do bucket e as credenciais S3',
          fileName: fileName
        });
      }

      console.log('Upload concluído com sucesso');

      // Atribuir o valor à variável publicUrl declarada anteriormente
      publicUrl = uploadResult.publicUrl;
      console.log('URL pública gerada:', publicUrl);
    } catch (storageError) {
      console.error('Exceção ao acessar storage do Supabase:', storageError);
      return res.status(500).json({ 
        message: 'Erro ao processar imagem', 
        error: storageError.message,
        details: 'Verifique a configuração do cliente Supabase Admin'
      });
    }

    // Usando o cliente global.supabaseAdmin ao invés de criar um novo
    if (!global.supabaseAdmin) {
      console.error('Cliente supabaseAdmin global não está disponível!');
      return res.status(500).json({
        message: 'Erro de configuração do servidor',
        details: 'Cliente Supabase Admin não está inicializado'
      });
    }

    // Chama a função de debitar créditos e participar do desafio
    const { data: result, error } = await global.supabaseAdmin.rpc(
      'join_challenge_with_credits',
      {
        p_user_id: userId,
        p_challenge_id: challengeId,
        p_start_weight: parseFloat(start_weight)
      }
    );

    if (error) {
      console.error('Erro ao participar do desafio:', error);
      throw error;
    }

    console.log('Resultado da participação:', result);

    if (!result.success) {
      return res.status(400).json({ 
        message: result.message 
      });
    }

    // Após participar com sucesso, atualiza a prova de peso inicial
    console.log('Atualizando prova de peso com URL:', publicUrl);
    if (publicUrl) {
      const { error: updateError } = await global.supabaseAdmin
        .from('challenge_participants')
        .update({ 
          proof_image: publicUrl 
        })
        .eq('challenge_id', challengeId)
        .eq('user_id', userId);

      if (updateError) {
        console.error('Erro ao atualizar prova de peso:', updateError);
        // Não falha a operação, apenas loga o erro
      }
    } else {
      console.warn('URL da imagem não disponível para salvar no banco de dados');
    }

    // Registra a atividade de participação em desafio
    await logActivity(global.supabaseAdmin, {
      userId,
      actionType: ActionTypes.JOIN,
      entityType: EntityTypes.CHALLENGE,
      entityId: challengeId,
      description: `Participação no desafio com peso inicial: ${start_weight}kg`,
      data: {
        challengeId,
        participantId: result.participant_id,
        transactionId: result.transaction_id,
        startWeight: parseFloat(start_weight),
        proofImageUrl: publicUrl
      },
      ipAddress: req.ip
    });

    res.json({ 
      message: result.message,
      participant_id: result.participant_id,
      transaction_id: result.transaction_id,
      new_balance: result.new_balance,
      proof_image_url: publicUrl
    });
  } catch (error) {
    console.error('Erro detalhado ao participar do desafio:', error);
    
    if (error.code === '23503') {
      return res.status(400).json({ 
        message: 'Erro de referência: usuário ou desafio não encontrado',
        details: error.details
      });
    }

    if (error.code === '42501') {
      return res.status(403).json({ 
        message: 'Sem permissão para participar do desafio',
        details: error.details
      });
    }

    res.status(500).json({ 
      message: 'Erro ao participar do desafio',
      error: error.message,
      details: error.details || error.hint || 'Tente novamente em alguns minutos'
    });
  }
});

// Enviar progresso do desafio
router.post('/:challengeId/progress', authMiddleware, upload.single('proofImage'), async (req, res) => {
  try {
    console.log('Recebendo requisição de progresso:', {
      body: req.body,
      file: req.file,
      params: req.params,
      user: req.user
    });

    const { challengeId } = req.params;
    const { currentWeight, description } = req.body;
    const userId = req.user.userId;

    if (!currentWeight) {
      return res.status(400).json({ message: 'Peso atual é obrigatório' });
    }

    if (!description) {
      return res.status(400).json({ message: 'Descrição é obrigatória' });
    }

    // Verifica se o usuário é participante do desafio
    const { data: participant, error: participantError } = await global.supabaseAdmin
      .from('challenge_participants')
      .select('*')
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)
      .single();

    if (participantError) {
      console.error('Erro ao verificar participante:', participantError);
      return res.status(404).json({ message: 'Participante não encontrado' });
    }

    if (!participant) {
      return res.status(404).json({ message: 'Você não é participante deste desafio' });
    }

    // Upload da imagem para o Supabase Storage
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'Imagem é obrigatória' });
    }

    try {
      // Usar o S3 diretamente em vez de tentar criar um bucket no Supabase
      console.log('Usando S3 diretamente para upload do arquivo...');
      
      // Gerar nome de arquivo único
      const fileExt = file.originalname.split('.').pop();
      const fileName = `challenge-proofs/${Date.now()}_${userId}.${fileExt}`;
      
      // Importar o utilitário S3
      const s3Utils = require('../utils/s3.utils');
      const uploadResult = await s3Utils.uploadToS3(
        file.buffer,
        fileName,
        file.mimetype
      );
      
      if (!uploadResult.success) {
        console.error('Erro detalhado ao fazer upload da imagem:', uploadResult.error);
        return res.status(500).json({ 
          message: 'Erro ao fazer upload da imagem', 
          error: uploadResult.error,
          details: 'Falha no upload para S3'
        });
      }
      
      console.log('Upload para S3 concluído com sucesso');
      const publicUrl = uploadResult.publicUrl;
      console.log('URL pública gerada:', publicUrl);

      // Usar o cliente Supabase Admin global já inicializado no server.js
      console.log('Registrando progresso usando o cliente supabaseAdmin global...');
      if (!global.supabaseAdmin) {
        console.error('Cliente supabaseAdmin global não está disponível!');
        return res.status(500).json({
          message: 'Erro de configuração do servidor',
          details: 'Cliente Supabase Admin não está inicializado'
        });
      }

      // Registra o progresso usando o cliente global.supabaseAdmin
      const { data: progress, error: progressError } = await global.supabaseAdmin
        .from('challenge_progress')
        .insert([{
          challenge_id: challengeId,
          user_id: userId,
          current_weight: parseFloat(currentWeight),
          proof_image: publicUrl, // Salva a URL completa em vez do nome do arquivo
          description: description,
          status: 'pending'
        }])
        .select()
        .single();

      if (progressError) {
        console.error('Erro ao registrar progresso:', progressError);
        return res.status(500).json({ 
          message: 'Erro ao registrar progresso',
          details: progressError.message
        });
      }

      console.log('Progresso registrado com sucesso:', progress);
      
      // Atualizar o peso final na tabela challenge_participants
      console.log('Atualizando o peso final na tabela challenge_participants...');
      const { error: updateError } = await global.supabaseAdmin
        .from('challenge_participants')
        .update({ 
          final_weight: parseFloat(currentWeight)
        })
        .eq('challenge_id', challengeId)
        .eq('user_id', userId);

      if (updateError) {
        console.error('Erro ao atualizar peso final:', updateError);
        // Continuamos mesmo com erro, apenas logamos
      } else {
        console.log('Peso final atualizado com sucesso para o participante');
      }
      
      // Registra a atividade de envio de progresso
      await logActivity(global.supabaseAdmin, {
        userId,
        actionType: ActionTypes.PROGRESS,
        entityType: EntityTypes.PROGRESS,
        entityId: progress.id,
        description: `Atualização de progresso: ${currentWeight}kg`,
        data: {
          challengeId,
          progressId: progress.id,
          currentWeight: parseFloat(currentWeight),
          description
        },
        ipAddress: req.ip
      });
      
      res.json(progress);
    } catch (error) {
      console.error('Erro ao processar progresso:', error);
      res.status(500).json({ 
        message: 'Erro ao processar progresso',
        details: error.message
      });
    }
  } catch (error) {
    console.error('Erro ao enviar progresso:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// Buscar status da revisão do progresso
router.get('/:challengeId/progress/:userId/review', authMiddleware, async (req, res) => {
  try {
    const { challengeId, userId } = req.params;

    // Verificar se temos ao menos um cliente disponível
    if (!global.supabaseAdmin && !global.supabase) {
      console.error('ERRO CRÍTICO: Nenhum cliente Supabase está disponível!');
      return res.status(500).json({
        message: 'Erro de configuração do servidor',
        details: 'Serviço temporariamente indisponível. Tente novamente mais tarde.'
      });
    }
    
    // Escolher o cliente disponível, preferindo o Admin
    const client = global.supabaseAdmin || global.supabase;
    console.log(`Usando cliente ${global.supabaseAdmin ? 'Admin' : 'Normal'} para buscar revisão de progresso`);

    // Busca o status da revisão
    let { data: review, error } = await client
      .from('challenge_progress')
      .select(`
        status,
        feedback,
        reviewed_at,
        reviewed_by:users!reviewed_by_id (
          name
        )
      `)
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Erro ao buscar revisão:', error);
      
      // Se temos dois clientes e um falhou, tente o outro
      if (global.supabaseAdmin && global.supabase && client === global.supabaseAdmin) {
        console.log('Tentando cliente alternativo para revisão...');
        const { data: backupReview, error: backupError } = await global.supabase
          .from('challenge_progress')
          .select(`
            status,
            feedback,
            reviewed_at,
            reviewed_by:users!reviewed_by_id (
              name
            )
          `)
          .eq('challenge_id', challengeId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (backupError) {
          console.error('Erro também com cliente backup para revisão:', backupError);
          return res.status(500).json({ 
            message: 'Erro ao buscar status da revisão',
            error: backupError.message
          });
        }
        
        review = backupReview;
      } else {
        return res.status(500).json({ 
          message: 'Erro ao buscar status da revisão',
          error: error.message
        });
      }
    }

    res.json(review);
  } catch (error) {
    console.error('Erro ao buscar status da revisão:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// Revisar progresso (apenas admin)
router.post('/:challengeId/progress/:progressId/review', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { challengeId, progressId } = req.params;
    const { status, feedback } = req.body;

    // Atualiza o status da revisão
    const { data: review, error } = await global.supabaseAdmin
      .from('challenge_progress')
      .update({
        status,
        feedback,
        reviewed_at: new Date().toISOString(),
        reviewed_by_id: req.user.userId
      })
      .eq('id', progressId)
      .eq('challenge_id', challengeId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar revisão:', error);
      return res.status(500).json({ message: 'Erro ao atualizar revisão' });
    }

    // Registra a atividade de revisão de progresso
    await logActivity(global.supabaseAdmin, {
      userId: req.user.userId,
      actionType: ActionTypes.ADMIN_ACTION,
      entityType: EntityTypes.PROGRESS,
      entityId: progressId,
      description: `Revisão de progresso: ${status}`,
      data: {
        challengeId,
        progressId,
        status,
        feedback,
        userId: review.user_id
      },
      ipAddress: req.ip
    });

    res.json(review);
  } catch (error) {
    console.error('Erro ao revisar progresso:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

module.exports = router; 