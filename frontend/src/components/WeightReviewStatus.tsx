import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

interface WeightReviewStatusProps {
  challengeId: string;
  userId: string;
  onStatusChange?: (status: string) => void;
}

interface ReviewStatus {
  status: 'pending' | 'approved' | 'rejected';
  feedback?: string;
  reviewedAt?: string;
  reviewedBy?: {
    name: string;
  };
}

export default function WeightReviewStatus({ challengeId, userId, onStatusChange }: WeightReviewStatusProps) {
  const [review, setReview] = useState<ReviewStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviewStatus();
  }, [challengeId, userId]);

  const fetchReviewStatus = async () => {
    try {
      const response = await api.get(`/challenges/${challengeId}/progress/${userId}/review`);
      setReview(response.data);
      if (onStatusChange) {
        onStatusChange(response.data.status);
      }
    } catch (error) {
      console.error('Erro ao buscar status da revisão:', error);
      toast.error('Erro ao carregar status da revisão');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse p-4 bg-gray-50 rounded-lg">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="space-y-3 mt-4">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (!review) {
    return null;
  }

  return (
    <div className={`p-4 rounded-lg ${
      review.status === 'approved' ? 'bg-green-50' :
      review.status === 'rejected' ? 'bg-red-50' :
      'bg-yellow-50'
    }`}>
      <div className="flex items-start">
        <div className={`rounded-full p-2 ${
          review.status === 'approved' ? 'bg-green-100' :
          review.status === 'rejected' ? 'bg-red-100' :
          'bg-yellow-100'
        }`}>
          {review.status === 'approved' ? (
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : review.status === 'rejected' ? (
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        <div className="ml-3">
          <h3 className={`text-sm font-medium ${
            review.status === 'approved' ? 'text-green-800' :
            review.status === 'rejected' ? 'text-red-800' :
            'text-yellow-800'
          }`}>
            {review.status === 'approved' ? 'Progresso Aprovado' :
             review.status === 'rejected' ? 'Progresso Rejeitado' :
             'Em Análise'}
          </h3>
          
          {review.feedback && (
            <p className={`mt-2 text-sm ${
              review.status === 'approved' ? 'text-green-700' :
              review.status === 'rejected' ? 'text-red-700' :
              'text-yellow-700'
            }`}>
              {review.feedback}
            </p>
          )}

          {review.reviewedAt && review.reviewedBy && (
            <p className="mt-2 text-sm text-gray-500">
              Revisado por {review.reviewedBy.name} em{' '}
              {new Date(review.reviewedAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 