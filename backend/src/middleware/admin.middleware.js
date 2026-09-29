const { createClient } = require('@supabase/supabase-js');

// Este middleware não precisa criar seu próprio cliente,
// podemos usar o global.supabase que já está inicializado
// corretamente no server.js

const adminMiddleware = async (req, res, next) => {
  try {
    // Verifica se o cliente global está disponível
    if (!global.supabase) {
      console.error('Cliente global do Supabase não está disponível');
      return res.status(500).json({ message: 'Erro de configuração do servidor' });
    }
    
    const { data: user, error } = await global.supabase
      .from('users')
      .select('is_admin')
      .eq('id', req.user.userId)
      .single();

    if (error) {
      console.error('Erro ao verificar permissões de admin:', error);
      return res.status(500).json({ message: 'Erro ao verificar permissões' });
    }

    if (!user?.is_admin) {
      return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar este recurso.' });
    }

    next();
  } catch (error) {
    console.error('Erro no middleware de admin:', error);
    res.status(500).json({ message: 'Erro ao verificar permissões de administrador' });
  }
};

module.exports = adminMiddleware; 