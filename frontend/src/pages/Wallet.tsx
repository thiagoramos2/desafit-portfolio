import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-hot-toast';
import { RootState } from '../store';
import api from '../services/api';

interface Transaction {
  id: string;
  valor: number;
  tipo: 'compra' | 'uso' | 'saque';
  status: 'pendente' | 'aprovado' | 'rejeitado';
  created_at: string;
  description: string;
}

interface WithdrawFormData {
  amount: number;
  pixKey: string;
}

const withdrawSchema = yup.object({
  amount: yup
    .number()
    .required('Valor é obrigatório')
    .positive('Valor deve ser positivo')
    .min(20, 'Valor mínimo para saque é R$ 20,00'),
  pixKey: yup
    .string()
    .required('Chave PIX é obrigatória')
    .min(5, 'Chave PIX inválida'),
});

export default function Wallet() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingCredits, setAddingCredits] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<WithdrawFormData>({
    resolver: yupResolver(withdrawSchema)
  });

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const response = await api.get('/credits/balance');
      setBalance(response.data.saldo);
      setTransactions(response.data.transactions);
    } catch (error) {
      console.error('Erro ao carregar dados da carteira:', error);
      toast.error('Erro ao carregar dados da carteira');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredits = async () => {
    try {
      setAddingCredits(true);
      const amount = parseFloat(creditAmount);
      
      if (isNaN(amount) || amount <= 0) {
        toast.error('Valor inválido');
        return;
      }

      const response = await api.post('/credits/add', { amount });
      window.location.href = response.data.init_point;
    } catch (error) {
      console.error('Erro ao adicionar créditos:', error);
      toast.error('Erro ao gerar link de pagamento');
    } finally {
      setAddingCredits(false);
    }
  };

  const onWithdrawSubmit = async (data: WithdrawFormData) => {
    try {
      await api.post('/credits/withdraw', {
        amount: data.amount,
        pixKey: data.pixKey
      });

      toast.success('Solicitação de saque enviada com sucesso!');
      setWithdrawModalOpen(false);
      reset();
      fetchWalletData();
    } catch (error: any) {
      console.error('Erro ao solicitar saque:', error);
      toast.error(error.response?.data?.message || 'Erro ao solicitar saque');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container-app">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Minha Carteira</h1>

        {/* Card de Saldo */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600">Saldo Disponível</p>
              <p className="text-4xl font-bold text-primary-600">
                R$ {balance.toFixed(2)}
              </p>
            </div>
            <div className="space-x-4">
              <button
                onClick={() => setWithdrawModalOpen(true)}
                className="btn-outline"
                disabled={balance < 20}
              >
                Solicitar Saque
              </button>
              <button
                onClick={() => document.getElementById('addCreditsModal')?.showModal()}
                className="btn-primary"
              >
                Adicionar Créditos
              </button>
            </div>
          </div>
        </div>

        {/* Histórico de Transações */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Histórico de Transações</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(transaction.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.tipo === 'compra' ? 'bg-green-100 text-green-800' :
                        transaction.tipo === 'uso' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {transaction.tipo === 'compra' ? 'Compra' :
                         transaction.tipo === 'uso' ? 'Uso' : 'Saque'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      R$ {transaction.valor.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.status === 'aprovado' ? 'bg-green-100 text-green-800' :
                        transaction.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {transaction.status === 'aprovado' ? 'Aprovado' :
                         transaction.status === 'pendente' ? 'Pendente' : 'Rejeitado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {transaction.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Adicionar Créditos */}
        <dialog id="addCreditsModal" className="modal">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Adicionar Créditos</h3>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Valor em R$</span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                min="10"
                step="10"
              />
            </div>
            <div className="modal-action">
              <form method="dialog">
                <button className="btn btn-ghost">Cancelar</button>
              </form>
              <button
                className="btn btn-primary"
                onClick={handleAddCredits}
                disabled={addingCredits}
              >
                {addingCredits ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </dialog>

        {/* Modal Solicitar Saque */}
        {withdrawModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold mb-4">Solicitar Saque</h3>
              <form onSubmit={handleSubmit(onWithdrawSubmit)}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Valor do Saque
                    </label>
                    <input
                      type="number"
                      {...register('amount')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                    {errors.amount && (
                      <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Chave PIX
                    </label>
                    <input
                      type="text"
                      {...register('pixKey')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                    {errors.pixKey && (
                      <p className="mt-1 text-sm text-red-600">{errors.pixKey.message}</p>
                    )}
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setWithdrawModalOpen(false)}
                    className="btn-outline"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary">
                    Confirmar Saque
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 