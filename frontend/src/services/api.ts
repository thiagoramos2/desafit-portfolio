import axios from 'axios';
import { store } from '../store';
import { logout } from '../store/slices/authSlice';
import { ChallengeData, ChallengeType, ChallengeProgress } from '../store/slices/challengeSlice';
import { User } from '../store/slices/authSlice';

// Obtém a URL da API do ambiente ou usa o endereço de produção
const API_URL = import.meta.env.VITE_API_URL || 'https://desafit-backend.onrender.com/api';

console.log('API URL configurada:', API_URL);

// Cria uma instância do axios com a URL base configurada
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Adiciona logs para debug
console.log('API URL configurada:', API_URL);

// Interceptor para adicionar o token em todas as requisições
api.interceptors.request.use(
  (config) => {
    console.log('Fazendo requisição para:', config.url);
    const token = store.getState().auth.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Token adicionado à requisição');
    } else {
      console.log('Requisição sem token');
    }
    return config;
  },
  (error) => {
    console.error('Erro na requisição:', error);
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => {
    console.log('Resposta recebida:', response.data);
    return response;
  },
  (error) => {
    console.error('Erro na resposta:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    if (error.response?.status === 401) {
      console.log('Token inválido ou expirado, fazendo logout');
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

// Interfaces para os comentários
export interface Comment {
  id: string;
  challenge_id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// Serviços de autenticação
export const authService = {
  register: async (data: { name: string; email: string; password: string }) => {
    try {
      console.log('Tentando registrar usuário:', { ...data, password: '***' });
      const response = await api.post('/auth/register', data);
      console.log('Registro bem-sucedido:', response.data);
      return response.data;
    } catch (error) {
      console.error('Falha no registro:', error);
      throw error;
    }
  },
  login: async (data: { email: string; password: string }) => {
    try {
      console.log('Tentando fazer login:', { email: data.email, password: '***' });
      const response = await api.post('/auth/login', data);
      console.log('Login bem-sucedido:', response.data);
      return response.data;
    } catch (error) {
      console.error('Falha no login:', error);
      throw error;
    }
  },
};

// Serviços de desafios
export const challengeService = {
  create: async (data: { 
    title: string; 
    goal: string; 
    duration: number; 
    bet_amount: number;
    weight_loss_goal: number;
    start_date: Date;
  }) => {
    try {
      console.log('Criando desafio:', data);
      // Garante que a data seja enviada no formato ISO
      const formattedData = {
        ...data,
        start_date: data.start_date.toISOString()
      };
      const response = await api.post('/challenges', formattedData);
      console.log('Desafio criado:', response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar desafio:', error);
      throw error;
    }
  },
  list: async () => {
    try {
      console.log('Listando desafios');
      const response = await api.get('/challenges');
      console.log('Desafios recebidos:', response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao listar desafios:', error);
      throw error;
    }
  },
  getById: async (id: string) => {
    try {
      console.log('Buscando desafio:', id);
      const response = await api.get(`/challenges/${id}`);
      console.log('Desafio encontrado:', response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar desafio:', error);
      throw error;
    }
  },
  join: async (id: string, formData: FormData) => {
    try {
      console.log('Participando do desafio:', id);
      const response = await api.post(`/challenges/${id}/join`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('Participação confirmada:', response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao participar do desafio:', error);
      throw error;
    }
  },
  updateProgress: async (id: string, data: FormData) => {
    try {
      console.log('Atualizando progresso:', { id, data });
      const response = await api.post(`/challenges/${id}/progress`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Progresso atualizado:', response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar progresso:', error);
      throw error;
    }
  },
};

// Serviços de pagamento
export const paymentService = {
  createSession: async (challengeId: string) => {
    const response = await api.post('/payments/create-session', { challengeId });
    return response.data;
  }
};

// Adicionar após a definição do paymentService
export const commentService = {
  // Obter comentários de um desafio
  async getCommentsByChallenge(challengeId: string): Promise<Comment[]> {
    try {
      console.log('Buscando comentários para o desafio:', challengeId);
      const response = await api.get<Comment[]>(`/comments/${challengeId}`);
      console.log('Comentários recebidos:', response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
      throw error;
    }
  },

  // Adicionar um novo comentário
  async addComment(challengeId: string, content: string): Promise<Comment> {
    try {
      console.log('Adicionando comentário:', { challenge_id: challengeId, content });
      const response = await api.post<Comment>('/comments', {
        challenge_id: challengeId,
        content
      });
      console.log('Comentário adicionado com sucesso:', response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      throw error;
    }
  },

  // Atualizar um comentário existente
  async updateComment(commentId: string, content: string): Promise<Comment> {
    try {
      console.log('Atualizando comentário:', { commentId, content });
      const response = await api.put<Comment>(`/comments/${commentId}`, {
        content
      });
      console.log('Comentário atualizado com sucesso:', response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar comentário:', error);
      throw error;
    }
  },

  // Remover um comentário
  async deleteComment(commentId: string): Promise<void> {
    try {
      console.log('Removendo comentário:', commentId);
      await api.delete(`/comments/${commentId}`);
      console.log('Comentário removido com sucesso');
    } catch (error) {
      console.error('Erro ao remover comentário:', error);
      throw error;
    }
  }
};

export default api; 