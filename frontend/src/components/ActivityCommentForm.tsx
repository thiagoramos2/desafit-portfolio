import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

interface ActivityCommentFormProps {
  onAddComment: (content: string) => Promise<boolean>;
}

export const ActivityCommentForm: React.FC<ActivityCommentFormProps> = ({ onAddComment }) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error('O comentário não pode estar vazio');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Enviar o comentário para o backend usando a função recebida via props
      const success = await onAddComment(content.trim());
      
      if (success) {
        // Limpa o formulário após o envio bem-sucedido
        setContent('');
        toast.success('Comentário adicionado com sucesso!');
      }
    } catch (error) {
      console.error('Erro no formulário de comentários:', error);
      toast.error('Erro ao adicionar comentário. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="mb-3">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Compartilhe seu progresso ou dê dicas para outros participantes..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-cyan-500 focus:border-cyan-500 resize-none"
          rows={3}
          disabled={isSubmitting}
        />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-cyan"
        >
          {isSubmitting ? 'Enviando...' : 'Comentar'}
        </button>
      </div>
    </form>
  );
}; 