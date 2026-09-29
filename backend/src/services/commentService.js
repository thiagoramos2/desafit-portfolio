// Usamos o cliente Supabase global que foi configurado no server.js
const supabase = global.supabase;

/**
 * @typedef {Object} Comment
 * @property {string} id
 * @property {string} challenge_id
 * @property {string} user_id
 * @property {string} content
 * @property {string} created_at
 * @property {string} updated_at
 * @property {string} [user_name]
 */

/**
 * Serviços para manipulação de comentários
 */
const commentService = {
  /**
   * Obtém todos os comentários para um desafio específico
   * @param {string} challengeId - ID do desafio
   * @returns {Promise<{data: Comment[]|null, error: any}>}
   */
  async getCommentsByChallenge(challengeId) {
    const { data, error } = await supabase
      .from('challenge_comments')
      .select(`
        *,
        users:user_id (
          name
        )
      `)
      .eq('challenge_id', challengeId)
      .order('created_at', { ascending: false });

    // Transformar os dados para incluir user_name
    const commentsWithUserNames = data?.map((comment) => ({
      ...comment,
      user_name: comment.users?.name || 'Usuário Anônimo',
      users: undefined // Remove o objeto aninhado
    }));

    return { data: commentsWithUserNames || null, error };
  },

  /**
   * Adiciona um novo comentário para um desafio
   * @param {string} challengeId - ID do desafio
   * @param {string} userId - ID do usuário
   * @param {string} content - Conteúdo do comentário
   * @returns {Promise<{data: Comment|null, error: any}>}
   */
  async addComment(challengeId, userId, content) {
    const { data, error } = await supabase
      .from('challenge_comments')
      .insert({
        challenge_id: challengeId,
        user_id: userId,
        content
      })
      .select()
      .single();

    return { data, error };
  },

  /**
   * Atualiza um comentário existente
   * @param {string} commentId - ID do comentário
   * @param {string} content - Novo conteúdo
   * @param {string} userId - ID do usuário (para verificação)
   * @returns {Promise<{data: Comment|null, error: any}>}
   */
  async updateComment(commentId, content, userId) {
    const { data, error } = await supabase
      .from('challenge_comments')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', commentId)
      .eq('user_id', userId) // Garante que apenas o dono possa atualizar
      .select()
      .single();

    return { data, error };
  },

  /**
   * Remove um comentário
   * @param {string} commentId - ID do comentário
   * @param {string} userId - ID do usuário (para verificação)
   * @returns {Promise<{error: any}>}
   */
  async deleteComment(commentId, userId) {
    const { error } = await supabase
      .from('challenge_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId); // Garante que apenas o dono possa deletar

    return { error };
  }
};

module.exports = { commentService }; 