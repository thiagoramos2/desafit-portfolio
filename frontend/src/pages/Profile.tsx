import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-hot-toast';
import { RootState } from '../store';
import { updateProfile } from '../store/slices/authSlice';
import api from '../services/api';

interface ProfileStats {
  totalChallenges: number;
  challengesWon: number;
  totalEarnings: number;
  weightLost: number;
}

const schema = yup.object({
  name: yup.string()
    .required('Nome é obrigatório')
    .min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: yup.string()
    .email('Email inválido')
    .required('Email é obrigatório'),
  currentPassword: yup.string()
    .min(6, 'Senha atual deve ter no mínimo 6 caracteres'),
  newPassword: yup.string()
    .min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('newPassword')], 'As senhas não conferem'),
}).required();

type FormData = yup.InferType<typeof schema>;

export default function Profile() {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    }
  });

  useEffect(() => {
    fetchProfileStats();
  }, []);

  const fetchProfileStats = async () => {
    try {
      const response = await api.get('/users/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      toast.error('Erro ao carregar estatísticas do perfil');
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      if (activeTab === 'profile') {
        // Atualiza apenas os dados do perfil
        const response = await api.put('/users/profile', {
          name: data.name,
          email: data.email
        });
        dispatch(updateProfile(response.data));
        toast.success('Perfil atualizado com sucesso!');
      } else if (activeTab === 'security' && data.currentPassword && data.newPassword) {
        // Atualiza apenas a senha
        await api.put('/users/password', {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword
        });
        toast.success('Senha alterada com sucesso!');
        reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (error: any) {
      console.error('Erro ao atualizar:', error);
      toast.error(error.response?.data?.message || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-app">
      <div className="max-w-4xl mx-auto">
        <h1>Meu Perfil</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="stat-card">
            <div className="stat-value">{stats?.totalChallenges || 0}</div>
            <div className="stat-label">Desafios Participados</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats?.challengesWon || 0}</div>
            <div className="stat-label">Desafios Vencidos</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">R$ {stats?.totalEarnings?.toFixed(2) || '0,00'}</div>
            <div className="stat-label">Total Ganho</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats?.weightLost || 0}kg</div>
            <div className="stat-label">Peso Perdido</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`${
                activeTab === 'profile'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Perfil
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`${
                activeTab === 'security'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Segurança
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`${
                activeTab === 'notifications'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Notificações
            </button>
          </nav>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="card">
              <div className="space-y-6">
                <div className="form-group">
                  <label htmlFor="name" className="form-label">Nome</label>
                  <input
                    type="text"
                    id="name"
                    className="input"
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="form-error">{errors.name.message}</p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input
                    type="email"
                    id="email"
                    className="input"
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="form-error">{errors.email.message}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="card">
              <div className="space-y-6">
                <div className="form-group">
                  <label htmlFor="currentPassword" className="form-label">Senha Atual</label>
                  <input
                    type="password"
                    id="currentPassword"
                    className="input"
                    {...register('currentPassword')}
                  />
                  {errors.currentPassword && (
                    <p className="form-error">{errors.currentPassword.message}</p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword" className="form-label">Nova Senha</label>
                  <input
                    type="password"
                    id="newPassword"
                    className="input"
                    {...register('newPassword')}
                  />
                  {errors.newPassword && (
                    <p className="form-error">{errors.newPassword.message}</p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword" className="form-label">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    className="input"
                    {...register('confirmPassword')}
                  />
                  {errors.confirmPassword && (
                    <p className="form-error">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Alterando...' : 'Alterar Senha'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="card">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Notificações por Email</h3>
                  <p className="text-sm text-gray-500">Receba atualizações sobre seus desafios</p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    defaultChecked
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Notificações Push</h3>
                  <p className="text-sm text-gray-500">Receba alertas em tempo real</p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    defaultChecked
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Newsletter</h3>
                  <p className="text-sm text-gray-500">Receba dicas e novidades semanais</p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => toast.success('Preferências salvas!')}
                >
                  Salvar Preferências
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 