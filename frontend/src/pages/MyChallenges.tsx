import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { RootState } from '../store';
import { fetchChallengesStart, fetchChallengesSuccess, fetchChallengesFailure } from '../store/slices/challengeSlice';
import { challengeService } from '../services/api';

export default function MyChallenges() {
  const dispatch = useDispatch();
  const { challenges, loading, error } = useSelector((state: RootState) => state.challenges);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        console.log('Buscando meus desafios...');
        dispatch(fetchChallengesStart());
        const data = await challengeService.list();
        // Filtra apenas os desafios que o usuário criou ou participa
        const myChallenges = data.filter((challenge: any) => {
          const isCreator = challenge.created_by === user?.id;
          const isParticipant = challenge.participants?.some(
            (p: any) => p.user_id === user?.id
          );
          return isCreator || isParticipant;
        });
        console.log('Meus desafios:', myChallenges);
        dispatch(fetchChallengesSuccess(myChallenges));
      } catch (error) {
        console.error('Erro ao buscar desafios:', error);
        dispatch(fetchChallengesFailure('Erro ao carregar seus desafios. Por favor, tente novamente.'));
      }
    };

    fetchChallenges();
  }, [dispatch, user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando seus desafios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erro ao carregar desafios</h3>
              <p className="mt-2 text-sm text-red-700">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 btn-primary"
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-semibold text-gray-900">Meus Desafios</h1>
          <p className="mt-2 text-sm text-gray-700">
            Acompanhe os desafios que você criou ou está participando
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link to="/challenges/new" className="btn-primary">
            Criar Novo Desafio
          </Link>
        </div>
      </div>

      {challenges && challenges.length > 0 ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {challenges.map((challenge: any) => (
            <div key={challenge.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">{challenge.title}</h3>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  challenge.created_by === user?.id
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {challenge.created_by === user?.id ? 'Criador' : 'Participante'}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-500">{challenge.goal}</p>
              <div className="mt-4 border-t border-gray-200 pt-4">
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Duração</dt>
                    <dd className="mt-1 text-sm text-gray-900">{challenge.duration} dias</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Aposta</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      R$ {challenge.bet_amount.toFixed(2)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="mt-1 text-sm text-gray-900">{challenge.status}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Participantes</dt>
                    <dd className="mt-1 text-sm text-gray-900">{challenge.participants?.length || 0}</dd>
                  </div>
                </dl>
              </div>
              <div className="mt-6">
                <Link
                  to={`/challenges/${challenge.id}`}
                  className="btn-primary w-full text-center"
                >
                  Ver Detalhes
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center mt-12">
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Nenhum desafio encontrado</h3>
          <p className="mt-1 text-sm text-gray-500">
            Comece criando um novo desafio ou participe de um existente.
          </p>
          <div className="mt-6">
            <Link to="/explore" className="btn-primary">
              Explorar Desafios
            </Link>
          </div>
        </div>
      )}
    </div>
  );
} 