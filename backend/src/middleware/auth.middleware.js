const { createClient } = require('@supabase/supabase-js');

// Não precisamos criar um novo cliente Supabase aqui.
// Vamos usar o global.supabase que já está inicializado no server.js

// Garantir que a chave esteja limpa
// const supabaseUrl = process.env.SUPABASE_URL;
// const supabaseKey = process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.replace(/[\r\n\s]+/g, '') : '';

// Criar cliente com a chave limpa
// const supabase = createClient(supabaseUrl, supabaseKey, {
//   auth: {
//     autoRefreshToken: true,
//     persistSession: false,
//     detectSessionInUrl: false
//   }
// });

const authMiddleware = async (req, res, next) => {
  try {
    // Verifica se o cliente global está disponível
    if (!global.supabase) {
      console.error('Cliente global do Supabase não está disponível');
      return res.status(500).json({ message: 'Erro de configuração do servidor' });
    }
    
    // Obtém o token do header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    // Verifica o token com o Supabase global
    const { data: { user }, error } = await global.supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Erro na autenticação:', error);
      return res.status(401).json({ message: 'Token inválido' });
    }

    // Use o cliente Supabase global para garantir consistência nas credenciais
    // Verifica se o usuário existe na tabela users
    const { data: existingUser, error: userError } = await global.supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError && userError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Erro ao verificar usuário:', userError);
      throw userError;
    }

    // Se o usuário não existe, cria ele
    if (!existingUser) {
      console.log('Usuário não encontrado, criando novo registro');
      const { error: insertError } = await global.supabase
        .from('users')
        .insert([{
          id: user.id,
          name: user.user_metadata?.name || user.email.split('@')[0],
          email: user.email,
          is_admin: false // Por padrão, usuários não são admin
        }]);

      if (insertError) {
        console.error('Erro ao criar usuário:', insertError);
        throw insertError;
      }
      console.log('Usuário criado com sucesso');
    }

    // Adiciona o usuário ao request
    req.user = {
      userId: user.id,
      email: user.email,
      name: user.user_metadata?.name || existingUser?.name
    };

    next();
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    return res.status(401).json({ message: 'Erro na autenticação' });
  }
};

module.exports = authMiddleware; 