const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { z } = require('zod');
const authMiddleware = require('../middleware/auth.middleware');
const { logActivity, ActionTypes, EntityTypes } = require('../utils/activity-logger');

// Usaremos o cliente global ao invés de criar um novo
// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Schema de validação para registro
const registerSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres')
});

// Schema de validação para login
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres')
});

// Registrar usuário
router.post('/register', async (req, res) => {
  try {
    // Validação dos dados
    const data = registerSchema.parse(req.body);
    
    // Verifica se o cliente global está disponível
    if (!global.supabase) {
      console.error('Cliente global do Supabase não está disponível');
      return res.status(500).json({ message: 'Erro de configuração do servidor' });
    }
    
    // Registra o usuário no Supabase Auth
    const { data: authData, error: authError } = await global.supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name
        }
      }
    });

    if (authError) {
      console.error('Erro no registro:', authError);
      return res.status(400).json({ message: authError.message });
    }

    // Insere o usuário na tabela personalizada users
    const { error: insertError } = await global.supabase
      .from('users')
      .insert([{
        id: authData.user.id,
        name: data.name,
        email: data.email,
        is_admin: false // Por padrão, usuários não são admin
      }]);

    if (insertError) {
      console.error('Erro ao inserir na tabela users:', insertError);
      
      // Não impedimos o registro caso falhe a inserção na tabela users
      // O middleware de autenticação tentará inseri-lo quando fizer login
    }

    // Registra a atividade de registro
    await logActivity(global.supabase, {
      userId: authData.user.id,
      actionType: ActionTypes.REGISTER,
      entityType: EntityTypes.USER,
      entityId: authData.user.id,
      description: `Usuário registrado: ${data.email}`,
      ipAddress: req.ip
    });
    
    res.status(201).json({ 
      message: 'Usuário registrado com sucesso',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: data.name
      }
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Dados inválidos',
        errors: error.errors 
      });
    }
    
    res.status(500).json({ message: 'Erro ao registrar usuário' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    // Validação dos dados
    const data = loginSchema.parse(req.body);
    
    // Verifica se o cliente global está disponível
    if (!global.supabase) {
      console.error('Cliente global do Supabase não está disponível');
      return res.status(500).json({ message: 'Erro de configuração do servidor' });
    }
    
    // Faz login no Supabase Auth
    const { data: authData, error: authError } = await global.supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password
    });

    if (authError) {
      console.error('Erro no login:', authError);
      return res.status(400).json({ message: authError.message });
    }

    // Busca dados adicionais do usuário na tabela users
    const { data: userData, error: userError } = await global.supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError && userError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Erro ao buscar dados do usuário:', userError);
      // Não impedimos o login caso falhe a busca na tabela users
    }

    // Se o usuário não existe na tabela users, cria-o
    let user = userData;
    if (!userData) {
      const { data: newUser, error: insertError } = await global.supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          name: authData.user.user_metadata?.name || authData.user.email.split('@')[0],
          email: authData.user.email,
          is_admin: false // Por padrão, usuários não são admin
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao criar usuário na tabela users:', insertError);
        // Não impedimos o login caso falhe a inserção na tabela users
      } else {
        user = newUser;
      }
    }

    // Registra a atividade de login
    await logActivity(global.supabase, {
      userId: authData.user.id,
      actionType: ActionTypes.LOGIN,
      entityType: EntityTypes.USER,
      entityId: authData.user.id,
      description: `Usuário logado: ${data.email}`,
      ipAddress: req.ip
    });
    
    res.json({ 
      message: 'Login realizado com sucesso',
      user: user || {
        id: authData.user.id,
        email: authData.user.email,
        name: authData.user.user_metadata?.name,
        is_admin: false
      },
      token: authData.session.access_token
    });
  } catch (error) {
    console.error('Erro no login:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Dados inválidos',
        errors: error.errors 
      });
    }
    
    res.status(500).json({ message: 'Erro ao fazer login' });
  }
});

// Verificar se é admin
router.get('/check-admin', authMiddleware, async (req, res) => {
  try {
    const { data: user, error } = await global.supabase
      .from('users')
      .select('is_admin')
      .eq('id', req.user.userId)
      .single();

    if (error) throw error;

    res.json({ isAdmin: user?.is_admin || false });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao verificar permissões de administrador' });
  }
});

module.exports = router; 