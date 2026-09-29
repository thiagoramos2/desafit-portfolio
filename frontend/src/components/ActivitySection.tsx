import { useState, useEffect } from 'react';
import { ActivityCommentForm } from './ActivityCommentForm';
import { commentService, Comment } from '../services/api';
import { toast } from 'react-hot-toast';

interface ActivitySectionProps {
  challengeId: string;
  userId: string;
  userName: string;
}

export const ActivitySection: React.FC<ActivitySectionProps> = ({ challengeId, userId, userName }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Carregar comentários do servidor
    const fetchComments = async () => {
      setLoading(true);
      try {
        const commentsData = await commentService.getCommentsByChallenge(challengeId);
        setComments(commentsData);
      } catch (error) {
        console.error('Erro ao carregar comentários:', error);
        toast.error('Não foi possível carregar os comentários');
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [challengeId]);

  const handleAddComment = async (content: string) => {
    try {
      console.log('Tentando adicionar comentário:', { challengeId, content });
      
      try {
        // Tenta usar a API real
        const newComment = await commentService.addComment(challengeId, content);
        console.log('Comentário adicionado no backend:', newComment);
        
        // Adicionar o nome do usuário ao comentário para exibição imediata
        const commentWithUserName = { ...newComment, user_name: userName };
        setComments(prevComments => [commentWithUserName, ...prevComments]);
        return true;
      } catch (apiError) {
        console.warn('API não funcionou, usando solução temporária:', apiError);
        
        // Solução temporária: cria um comentário local
        const tempComment: Comment = {
          id: `temp-${Date.now()}`,
          challenge_id: challengeId,
          user_id: userId,
          user_name: userName,
          content: content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log('Adicionando comentário temporário:', tempComment);
        setComments(prevComments => [tempComment, ...prevComments]);
        toast.success('Comentário adicionado localmente (modo temporário)');
        return true;
      }
    } catch (error) {
      console.error('Erro ao adicionar comentário no frontend:', error);
      toast.error('Não foi possível adicionar o comentário');
      return false;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mt-6">
      <h2 className="text-xl font-bold mb-4">Atividade do Desafio</h2>
      
      <ActivityCommentForm onAddComment={handleAddComment} />
      
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">Comentários</h3>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Seja o primeiro a comentar neste desafio!
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map(comment => (
              <div key={comment.id} className="border-b border-gray-100 pb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-800 font-semibold">
                      {comment.user_name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {comment.user_name}
                        {comment.user_id === userId && <span className="ml-2 text-xs text-gray-500">(você)</span>}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(comment.created_at)}</p>
                    </div>
                    <p className="mt-1 text-sm text-gray-700">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 