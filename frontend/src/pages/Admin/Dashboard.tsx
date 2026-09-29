import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface DashboardStats {
  totalUsers: number;
  totalChallenges: number;
  totalParticipants: number;
  totalRevenue: number;
  totalDeposits: number;
  totalWithdrawn: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/admin/dashboard');
        setStats(response.data);
      } catch (error) {
        setError('Erro ao carregar estatísticas');
        console.error('Erro:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 text-red-800 p-4 rounded-lg">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Painel Administrativo</h1>
      
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-gray-500 text-sm font-medium">Total de Usuários</h2>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalUsers}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-gray-500 text-sm font-medium">Total de Desafios</h2>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalChallenges}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-gray-500 text-sm font-medium">Participantes</h2>
          <p className="text-3xl font-bold text-gray-900">{stats?.totalParticipants}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-gray-500 text-sm font-medium">Receita Desafios</h2>
          <p className="text-3xl font-bold text-gray-900">
            R$ {stats?.totalRevenue.toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-gray-500 text-sm font-medium">Total Depositado</h2>
          <p className="text-3xl font-bold text-green-600">
            R$ {stats?.totalDeposits.toFixed(2)}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-gray-500 text-sm font-medium">Total Retirado</h2>
          <p className="text-3xl font-bold text-red-600">
            R$ {stats?.totalWithdrawn.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/admin/users')}
          className="bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3 px-4 border border-gray-300 rounded-lg shadow-sm flex items-center justify-center"
        >
          Gerenciar Usuários
        </button>
        
        <button
          onClick={() => navigate('/admin/challenges')}
          className="bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3 px-4 border border-gray-300 rounded-lg shadow-sm flex items-center justify-center"
        >
          Gerenciar Desafios
        </button>
      </div>
    </div>
  );
} 