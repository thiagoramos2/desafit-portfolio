const express = require('express');
const { commentService } = require('../services/commentService');
const authenticateToken = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @route GET /api/comments/:challengeId
 * @desc Obtém todos os comentários para um desafio específico
 * @access Public
 */
router.get('/:challengeId', async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { data, error } = await commentService.getCommentsByChallenge(challengeId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Erro ao buscar comentários:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @route POST /api/comments
 * @desc Adiciona um novo comentário
 * @access Private
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { challenge_id, content } = req.body;
    const userId = req.user?.userId;

    if (!challenge_id || !content) {
      return res.status(400).json({ error: 'ID do desafio e conteúdo são obrigatórios' });
    }

    const { data, error } = await commentService.addComment(challenge_id, userId, content);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json(data);
  } catch (error) {
    console.error('Erro ao adicionar comentário:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @route PUT /api/comments/:id
 * @desc Atualiza um comentário existente
 * @access Private
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user?.userId;

    if (!content) {
      return res.status(400).json({ error: 'Conteúdo é obrigatório' });
    }

    const { data, error } = await commentService.updateComment(id, content, userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Erro ao atualizar comentário:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @route DELETE /api/comments/:id
 * @desc Remove um comentário
 * @access Private
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const { error } = await commentService.deleteComment(id, userId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Comentário removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover comentário:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router; 