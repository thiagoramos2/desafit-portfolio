import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { RootState } from '../store';
import { fetchChallengesStart, fetchChallengesSuccess, fetchChallengesFailure } from '../store/slices/challengeSlice';
import { challengeService } from '../services/api';

export default function Explore() {
  const dispatch = useDispatch();
  const { challenges, loading, error } = useSelector((state: RootState) => state.challenges);
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('popular');

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        console.log('Iniciando busca de desafios...');
        dispatch(fetchChallengesStart());
        const data = await challengeService.list();
        console.log('Desafios recebidos:', data);
        dispatch(fetchChallengesSuccess(data));
      } catch (error) {
        console.error('Erro ao buscar desafios:', error);
        dispatch(fetchChallengesFailure('Erro ao carregar desafios. Por favor, tente novamente.'));
      }
    };

    fetchChallenges();
  }, [dispatch]);

  const calcularPoteTotal = (betAmount: number, participantsCount: number) => {
    return betAmount * participantsCount;
  };

  const getDiasRestantes = (challenge: any) => {
    const createdDate = new Date(challenge.created_at);
    const endDate = new Date(createdDate);
    endDate.setDate(endDate.getDate() + challenge.duration);
    
    const hoje = new Date();
    const diffTime = endDate.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  // Verifica se o usuário é participante de um desafio
  const isUserParticipant = (challenge: any) => {
    if (!isAuthenticated || !user || !challenge.participants) return false;
    return challenge.participants.some((p: any) => p.user_id === user.id);
  };

  console.log('Estado atual:', { loading, error, challengesCount: challenges?.length });

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    const endDate = new Date(data);
    endDate.setDate(endDate.getDate() + 30); // Assumindo 30 dias de duração padrão
    
    const formatarParaBR = (d: Date) => {
      return `${d.getDate()} de ${d.toLocaleString('pt-BR', { month: 'short' })}`;
    };
    
    return `${formatarParaBR(data)} - ${formatarParaBR(endDate)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando desafios...</p>
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

  // Filtrar desafios com base no termo de pesquisa
  const filteredChallenges = challenges?.filter(challenge => 
    challenge.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Ordenar e filtrar desafios com base na aba ativa
  let sortedChallenges = [...(filteredChallenges || [])];
  
  if (activeTab === 'popular') {
    sortedChallenges.sort((a, b) => b.participants.length - a.participants.length);
  } else if (activeTab === 'soon') {
    sortedChallenges.sort((a, b) => {
      const diasA = getDiasRestantes(a);
      const diasB = getDiasRestantes(b);
      return diasA - diasB;
    });
  } else if (activeTab === 'high') {
    sortedChallenges.sort((a, b) => b.bet_amount - a.bet_amount);
  } else if (activeTab === 'new') {
    sortedChallenges.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (activeTab === 'my') {
    sortedChallenges = sortedChallenges.filter(challenge => isUserParticipant(challenge));
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Main Content */}
      <main className="px-4 sm:px-8 md:px-12 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Diretório de desafios</h1>
        <p className="text-gray-700 mt-1">
          Encontre um desafio que seja ideal para você - ou <Link to="/challenges/new" className="text-cyan-500 hover:text-cyan-700 hover:underline transition-colors">comece o seu próprio</Link>!
        </p>

        {/* Search Bar */}
        <div className="flex mt-6">
          <div className="flex-grow">
            <input 
              type="text" 
              placeholder="Pesquisar um desafio..." 
              className="w-full border border-gray-300 rounded-l px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn-cyan rounded-l-none rounded-r">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Tabs - Scrollable on mobile */}
        <div className="flex border-b mt-8 overflow-x-auto pb-1 whitespace-nowrap">
          <button 
            className={`px-3 sm:px-6 py-3 font-medium ${activeTab === 'popular' ? 'border-b-2 border-cyan-500 text-cyan-500' : 'text-gray-600 hover:text-cyan-500'} transition-colors`}
            onClick={() => setActiveTab('popular')}
          >
            Mais participantes
          </button>
          <button 
            className={`px-3 sm:px-6 py-3 font-medium ${activeTab === 'soon' ? 'border-b-2 border-cyan-500 text-cyan-500' : 'text-gray-600 hover:text-cyan-500'} transition-colors`}
            onClick={() => setActiveTab('soon')}
          >
            Começando em breve
          </button>
          <button 
            className={`px-3 sm:px-6 py-3 font-medium ${activeTab === 'high' ? 'border-b-2 border-cyan-500 text-cyan-500' : 'text-gray-600 hover:text-cyan-500'} transition-colors`}
            onClick={() => setActiveTab('high')}
          >
            Altas apostas
          </button>
          <button 
            className={`px-3 sm:px-6 py-3 font-medium ${activeTab === 'new' ? 'border-b-2 border-cyan-500 text-cyan-500' : 'text-gray-600 hover:text-cyan-500'} transition-colors`}
            onClick={() => setActiveTab('new')}
          >
            Novo
          </button>
          <button 
            className={`px-3 sm:px-6 py-3 font-medium ${activeTab === 'my' ? 'border-b-2 border-cyan-500 text-cyan-500' : 'text-gray-600 hover:text-cyan-500'} transition-colors`}
            onClick={() => setActiveTab('my')}
          >
            Meus desafios
          </button>
          <button 
            className={`px-3 sm:px-6 py-3 font-medium ${activeTab === 'all' ? 'border-b-2 border-cyan-500 text-cyan-500' : 'text-gray-600 hover:text-cyan-500'} transition-colors`}
            onClick={() => setActiveTab('all')}
          >
            Todos
          </button>
          <div className="flex-grow"></div>
          <button className="px-3 sm:px-6 py-3 text-cyan-500 hover:text-cyan-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
            <span className="hidden sm:inline">Filtro</span>
          </button>
        </div>

        {sortedChallenges && sortedChallenges.length > 0 ? (
          <div className="mt-6 space-y-6">
            {sortedChallenges.map((challenge) => {
              const poteTotal = calcularPoteTotal(challenge.bet_amount, challenge.participants.length);
              const diasRestantes = getDiasRestantes(challenge);
              const userIsParticipant = isUserParticipant(challenge);
              
              return (
                <div key={challenge.id} className="border rounded-lg p-4 sm:p-6 bg-white hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center">
                    <div className="w-full sm:w-auto sm:mr-6 mb-4 sm:mb-0">
                      <div className="relative w-full h-48 sm:w-40 sm:h-32">
                        <div className="absolute top-0 left-0 bg-orange-600 text-white px-2 py-1 text-xs">Kickstarter</div>
                        <img 
                          src={challenge.image_url || "https://images.unsplash.com/photo-1511649475669-e288648b2339?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80"} 
                          className="w-full h-full object-cover" 
                          alt={challenge.title} 
                        />
                        {challenge.is_verified && (
                          <div className="absolute bottom-2 right-2 bg-cyan-500 rounded-full p-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-grow">
                      <h2 className="text-xl font-bold text-gray-800">{challenge.title}</h2>
                      <p className="text-gray-600 mt-1">{formatarData(challenge.created_at)}</p>
                      <div className="flex flex-wrap items-center mt-2 gap-y-1">
                        <span className="text-gray-700">Aposta de R${challenge.bet_amount.toFixed(2)}</span>
                        <span className="mx-3 text-gray-400 hidden sm:inline">|</span>
                        <span className="text-gray-700 w-full sm:w-auto"><strong>{challenge.participants.length}</strong> participantes</span>
                        <span className="mx-3 text-gray-400 hidden sm:inline">|</span>
                        <span className="text-gray-700 w-full sm:w-auto">Pote de <strong className="text-gray-900">R$ {poteTotal.toFixed(2)}</strong></span>
                      </div>
                      <div className="flex items-center mt-2 text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        {diasRestantes > 0 ? `Faltam ${diasRestantes} dias` : 'Encerrado'}
                      </div>
                    </div>
                    <div className="w-full sm:w-auto mt-4 sm:mt-0">
                      {userIsParticipant ? (
                        <div className="flex flex-col space-y-2">
                          <div className="text-sm text-cyan-700 font-medium px-6 py-2 text-center sm:text-left">
                            Você já está participando
                          </div>
                          <Link
                            to={`/challenges/${challenge.id}`}
                            className="btn-cyan w-full text-center"
                          >
                            Ver desafio
                          </Link>
                        </div>
                      ) : (
                        <Link
                          to={`/challenges/${challenge.id}`}
                          className="btn-orange w-full text-center sm:w-auto"
                        >
                          Entrar no desafio
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center mt-12">
            <h3 className="mt-2 text-sm font-semibold text-gray-900">Nenhum desafio encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">
              {activeTab === 'my' && isAuthenticated ? 
                'Você ainda não está participando de nenhum desafio.' :
                'Comece criando um novo desafio para você e seus amigos.'}
            </p>
            <div className="mt-6">
              <Link to="/challenges/new" className="btn-orange">
                Criar Novo Desafio
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 