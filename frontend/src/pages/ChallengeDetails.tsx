import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setCurrentChallenge, clearCurrentChallenge } from '../store/slices/challengeSlice';
import { challengeService, paymentService } from '../services/api';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { ActivitySection } from '../components/ActivitySection';

export default function ChallengeDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentChallenge } = useSelector((state: RootState) => state.challenges);
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [joining, setJoining] = useState(false);
  const [startWeight, setStartWeight] = useState('');
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [finalWeight, setFinalWeight] = useState('');
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [initialProofImage, setInitialProofImage] = useState<File | null>(null);
  const [updating, setUpdating] = useState(false);
  const [description, setDescription] = useState('');

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        setLoading(true);
        const data = await challengeService.getById(id!);
        dispatch(setCurrentChallenge(data));
      } catch (error) {
        setError('Erro ao carregar detalhes do desafio');
      } finally {
        setLoading(false);
      }
    };

    fetchChallenge();

    return () => {
      dispatch(clearCurrentChallenge());
    };
  }, [id, dispatch]);

  // Função para abrir modal de participação
  const openJoinModal = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setJoinModalOpen(true);
  };

  // Função para fechar modal
  const closeJoinModal = () => {
    setJoinModalOpen(false);
    setStartWeight('');
    setInitialProofImage(null);
    setError(null);
  };

  // Função que será chamada ao confirmar participação
  const confirmJoinChallenge = async () => {
    if (!startWeight || isNaN(parseFloat(startWeight)) || parseFloat(startWeight) <= 0) {
      setError('Por favor, informe um peso inicial válido');
      return;
    }

    if (!initialProofImage) {
      setError('Por favor, envie uma foto comprobatória do seu peso inicial');
      return;
    }

    try {
      setJoining(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('startWeight', startWeight);
      formData.append('initialProofImage', initialProofImage);
      
      const response = await challengeService.join(id!, formData);
      console.log('Participação confirmada:', response);
      
      // Atualiza os dados do desafio
      const updatedChallenge = await challengeService.getById(id!);
      dispatch(setCurrentChallenge(updatedChallenge));
      
      // Fecha o modal
      closeJoinModal();
    } catch (error: any) {
      console.error('Erro ao participar do desafio:', error);
      
      // Verifica se o erro é de saldo insuficiente
      if (error.response?.data?.message?.includes('Saldo insuficiente')) {
        setError(
          <div>
            <p>Saldo insuficiente para participar deste desafio.</p>
            <button 
              onClick={() => {
                closeJoinModal();
                navigate('/wallet');
              }}
              className="mt-2 text-primary-600 font-medium hover:text-primary-500 focus:outline-none"
            >
              Clique aqui para adicionar créditos
            </button>
          </div>
        );
      } else {
        setError(error.response?.data?.message || 'Erro ao participar do desafio');
      }
    } finally {
      setJoining(false);
    }
  };

  const handleUpdateProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentChallenge || !user) return;

    try {
      setUpdating(true);
      setError(null);

      const formData = new FormData();
      formData.append('currentWeight', finalWeight);
      formData.append('description', description);
      if (proofImage) {
        formData.append('proofImage', proofImage);
      }

      await challengeService.updateProgress(id!, formData);
      const updatedChallenge = await challengeService.getById(id!);
      dispatch(setCurrentChallenge(updatedChallenge));

      // Limpa os campos após atualização
      setStartWeight('');
      setFinalWeight('');
      setProofImage(null);
      setDescription('');
    } catch (error: any) {
      console.error('Erro ao atualizar progresso:', error);
      setError(error.response?.data?.message || 'Erro ao atualizar progresso');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (error || !currentChallenge) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error || 'Desafio não encontrado'}</p>
        </div>
      </div>
    );
  }

  const isParticipant = currentChallenge.participants?.some(
    (p) => p.user_id === user?.id
  );

  const currentParticipant = currentChallenge.participants?.find(
    (p) => p.user_id === user?.id
  );

  // Ordena participantes por perda de peso (%)
  const sortedParticipants = [...(currentChallenge.participants || [])].sort((a, b) => {
    // Função para calcular o percentual de perda de peso
    const calculateWeightLoss = (participant: any) => {
      if (!participant.start_weight || !participant.final_weight) return -1; // Quem não tem peso final fica por último
      return (participant.start_weight - participant.final_weight) / participant.start_weight * 100;
    };

    const aLoss = calculateWeightLoss(a);
    const bLoss = calculateWeightLoss(b);
    
    // Se ambos têm percentual válido, ordena do maior para o menor
    if (aLoss >= 0 && bLoss >= 0) {
      return bLoss - aLoss; // Ordem decrescente por percentual
    }
    
    // Coloca quem tem percentual calculado na frente de quem não tem
    if (aLoss >= 0) return -1;
    if (bLoss >= 0) return 1;
    
    // Se nenhum tem percentual, mantém a ordem original
    return 0;
  });

  // Cálculo do pote total e prêmios
  const totalParticipants = currentChallenge.participants?.length || 0;
  const totalPot = totalParticipants * currentChallenge.bet_amount;
  const winners = sortedParticipants.filter(p => {
    if (!p.start_weight || !p.final_weight) return false;
    const weightLoss = ((p.start_weight - p.final_weight) / p.start_weight * 100);
    return weightLoss >= currentChallenge.weight_loss_goal;
  });
  const totalWinners = winners.length;
  const platformFee = 0.2; // 20% de taxa
  
  // Novo cálculo do prêmio
  const losersCount = totalParticipants - totalWinners;
  const losersPot = losersCount * currentChallenge.bet_amount;
  const platformFeeAmount = losersPot * platformFee;
  const totalPrizePool = totalPot - platformFeeAmount;
  const prizePerWinner = totalWinners > 0 
    ? totalPrizePool / totalWinners 
    : 0;

  // Cálculo da duração restante
  const now = new Date();
  
  // Função para verificar se uma data é válida
  const isValidDate = (date: any) => {
    return date instanceof Date && !isNaN(date.getTime());
  };

  // Função para converter string em data
  const parseDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return isValidDate(date) ? date : null;
    } catch {
      return null;
    }
  };

  const startDate = parseDate(currentChallenge.start_date);
  const endDate = parseDate(currentChallenge.end_date);
  
  const daysRemaining = startDate && endDate ? 
    Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  
  const hasStarted = startDate ? now >= startDate : false;
  const hasEnded = endDate ? now >= endDate : false;
  const status = hasEnded ? 'Finalizado' : (hasStarted ? 'Em andamento' : 'Aguardando início');

  const formatDate = (date: Date | null) => {
    if (!date || !isValidDate(date)) return 'Data não definida';
    
    try {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Data inválida';
    }
  };

  const getDurationText = () => {
    if (!startDate || !isValidDate(startDate)) return 'Data de início inválida';
    if (hasEnded) return 'Encerrado';
    if (hasStarted) return `${daysRemaining} dias`;
    
    const daysToStart = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return `Inicia em ${Math.abs(daysToStart)} dias`;
  };

  const getWeightLossGoal = () => {
    const goal = Number(currentChallenge.weight_loss_goal);
    return !isNaN(goal) ? `${goal.toFixed(1)}%` : 'Meta não definida';
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container-app px-4 sm:px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-cyan-600">desafit</h1>
            <p className="text-gray-600 text-sm">Olá, {user?.name}</p>
          </div>
          <Link to="/explore" className="text-cyan-500 hover:text-cyan-700">
            ← Voltar aos Desafios
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-app px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : currentChallenge ? (
          <div>
            {/* Banner do Desafio - Design Modernizado */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="relative h-48 sm:h-56 md:h-64 bg-gradient-to-br from-cyan-600 via-cyan-500 to-cyan-400">
                {/* Overlay com efeito de padrão para adicionar textura */}
                <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC40Ij48cGF0aCBkPSJNMjkgNTlsMyAzIDMtM3oiLz48cGF0aCBkPSJNMjkgNTlsMy0zIDMgM3oiLz48cGF0aCBkPSJNMzUgNTlsLTMtMyAzLTN6Ii8+PHBhdGggZD0iTTQxIDQ1bC0zIDMgMy0zeiIvPjwvZz48L2c+PC9zdmc+')]"></div>
                
                <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8 bg-gradient-to-t from-black/50 via-black/30 to-transparent text-white">
                  <div className="max-w-3xl">
                    <div className="inline-block px-3 py-1 rounded-full bg-cyan-500 bg-opacity-30 backdrop-blur-sm text-xs font-semibold mb-3 border border-cyan-200/30">
                      {status}
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight drop-shadow-sm text-white">{currentChallenge.title}</h1>
                    <p className="text-sm sm:text-base mt-2 text-cyan-50 flex items-center">
                      <span className="w-6 h-6 rounded-full bg-cyan-300 flex items-center justify-center text-cyan-800 font-bold mr-2">
                        {currentChallenge.created_by?.name?.[0]?.toUpperCase() || 'A'}
                      </span>
                      Criado por {currentChallenge.created_by?.name || 'Anônimo'} • {parseDate(currentChallenge.created_at)?.toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 sm:p-8">
                <div className="flex flex-wrap gap-6 sm:gap-8 mb-6 justify-between">
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-sm font-medium">Aposta</span>
                    <span className="text-xl font-bold text-gray-900">R$ {currentChallenge.bet_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-sm font-medium">Participantes</span>
                    <span className="text-xl font-bold text-gray-900">{currentChallenge.participants?.length || 0}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-sm font-medium">Pot Total</span>
                    <span className="text-xl font-bold text-gray-900">R$ {(currentChallenge.bet_amount * (currentChallenge.participants?.length || 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500 text-sm font-medium">Prazo</span>
                    <span className="text-xl font-bold text-gray-900">{getDurationText()}</span>
                  </div>
                </div>
                
                {/* Botão para Participar (se não estiver participando) */}
                {isParticipant ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-green-800 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Você já está participando deste desafio!
                    </p>
                  </div>
                ) : !hasEnded && (
                  <button
                    onClick={openJoinModal}
                    disabled={joining}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white font-medium rounded-lg shadow-sm hover:from-cyan-700 hover:to-cyan-600 transition-colors duration-200 flex items-center justify-center gap-2"
                  >
                    {joining ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Processando...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                        </svg>
                        <span>Participar do Desafio</span>
                      </>
                    )}
                  </button>
                )}
            
                {/* Informações principais do desafio */}
                <div className="mt-6">
                  <h2 className="text-xl font-bold mb-2">Sobre este desafio</h2>
                  <p className="text-gray-700">{currentChallenge.goal}</p>
                  
                  <div className="mt-4">
                    <span className="text-sm text-gray-500">Meta de perda de peso:</span>
                    <p className="font-medium">{getWeightLossGoal()}</p>
                  </div>
                  
                  <div className="mt-4">
                    <span className="text-sm text-gray-500">Duração:</span>
                    <p className="font-medium">{currentChallenge.duration} dias</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Seção de atividades */}
            {isAuthenticated && (
              <ActivitySection 
                challengeId={id || ''}
                userId={user?.id || ''}
                userName={user?.name || 'Usuário'}
              />
            )}
            
            {/* Seção para atualizar progresso (se já estiver participando) */}
            {isParticipant && !hasEnded && (
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mt-6">
                <h2 className="text-xl font-bold mb-4">Atualizar meu progresso</h2>
                
                <form onSubmit={handleUpdateProgress} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="currentWeight" className="block text-sm font-medium text-gray-700 mb-1">
                        Peso atual (kg)
                      </label>
                      <input
                        type="number"
                        id="currentWeight"
                        name="currentWeight"
                        value={finalWeight}
                        onChange={(e) => setFinalWeight(e.target.value)}
                        step="0.1"
                        min="0"
                        required
                        className="w-full p-2 border border-gray-300 rounded focus:ring-cyan-500 focus:border-cyan-500"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="proofImage" className="block text-sm font-medium text-gray-700 mb-1">
                        Foto comprovante (balança)
                      </label>
                      <input
                        type="file"
                        id="proofImage"
                        name="proofImage"
                        accept="image/*"
                        onChange={(e) => setProofImage(e.target.files?.[0] || null)}
                        required
                        className="w-full p-2 border border-gray-300 rounded focus:ring-cyan-500 focus:border-cyan-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Descreva seu progresso (opcional)
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-cyan-500 focus:border-cyan-500"
                    ></textarea>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={updating}
                      className="btn-cyan"
                    >
                      {updating ? 'Enviando...' : 'Enviar Atualização'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Ranking de participantes */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mt-6">
              <h2 className="text-xl font-bold mb-4">Ranking de Participantes</h2>

              {currentChallenge.participants && currentChallenge.participants.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Posição
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Participante
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Peso Inicial
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Peso Atual
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Perda (%)
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {/* Ordenar os participantes pela porcentagem de perda de peso (maior para menor) */}
                      {sortedParticipants.map((participant, index) => {
                        const weightLossPercentage = participant.start_weight && participant.final_weight 
                          ? ((participant.start_weight - participant.final_weight) / participant.start_weight * 100)
                          : 0;
                          
                        return (
                          <tr key={participant.user_id} className={participant.user_id === user?.id ? "bg-cyan-50" : ""}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                              {participant.user_name || "Participante"}
                              {participant.user_id === user?.id && " (você)"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                              {participant.start_weight?.toFixed(1) || "-"} kg
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                              {participant.final_weight?.toFixed(1) || "-"} kg
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                              {weightLossPercentage > 0 
                                ? `${weightLossPercentage.toFixed(2)}%` 
                                : "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${participant.status === 'active' ? 'bg-green-100 text-green-800' : 
                                  participant.status === 'completed' ? 'bg-blue-100 text-blue-800' : 
                                    'bg-red-100 text-red-800'}`}>
                                {participant.status === 'active' ? 'Ativo' : 
                                  participant.status === 'completed' ? 'Completou' : 'Falhou'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Nenhum participante ainda.
                </div>
              )}
            </div>
            
            {/* Informações sobre prêmios */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mt-6">
              <h2 className="text-xl font-bold mb-4">Distribuição de Prêmios</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Pote Total</h3>
                    <p className="text-3xl font-bold text-cyan-600">R$ {totalPot.toFixed(2)}</p>
                    <div className="mt-2 text-sm text-gray-500">
                      {totalParticipants} participantes x R$ {currentChallenge.bet_amount.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Prêmio por Vencedor</h3>
                    <p className="text-3xl font-bold text-cyan-600">
                      {totalWinners > 0 
                        ? `R$ ${prizePerWinner.toFixed(2)}` 
                        : "Aguardando resultados"}
                    </p>
                    <div className="mt-2 text-sm text-gray-500">
                      {totalWinners > 0 
                        ? `${totalWinners} vencedor(es) até o momento` 
                        : "Ainda não há vencedores qualificados"}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 text-sm text-gray-500">
                <p>* Para ser considerado vencedor, o participante deve atingir a meta de perda de pelo menos {currentChallenge.weight_loss_goal}% do peso inicial</p>
                <p>* Taxa da plataforma: 20% do valor apostado pelos participantes que não atingirem a meta</p>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Modal de Participação */}
      <Transition appear show={joinModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeJoinModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Participar do Desafio
                  </Dialog.Title>
                  
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-4">
                      Para participar deste desafio, será debitado o valor de <strong>R$ {currentChallenge?.bet_amount.toFixed(2)}</strong> dos seus créditos.
                    </p>
                    
                    <div className="mb-4">
                      <label htmlFor="startWeight" className="block text-sm font-medium text-gray-700">
                        Informe seu peso inicial (kg)
                      </label>
                      <input
                        type="number"
                        id="startWeight"
                        step="0.1"
                        value={startWeight}
                        onChange={(e) => setStartWeight(e.target.value)}
                        className="input mt-1 w-full"
                        placeholder="Ex: 75.5"
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="initialProofImage" className="block text-sm font-medium text-gray-700">
                        Foto comprobatória (balança ou medidor)
                      </label>
                      <input
                        type="file"
                        id="initialProofImage"
                        accept="image/*"
                        onChange={(e) => setInitialProofImage(e.target.files?.[0] || null)}
                        className="input mt-1 w-full"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Envie uma foto clara da balança mostrando seu peso atual
                      </p>
                    </div>
                    
                    {error && (
                      <div className="mb-4 rounded-md bg-red-50 p-4">
                        <div className="text-sm text-red-700">{error}</div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                      onClick={closeJoinModal}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
                      onClick={confirmJoinChallenge}
                      disabled={joining}
                    >
                      {joining ? 'Processando...' : 'Confirmar Participação'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
} 