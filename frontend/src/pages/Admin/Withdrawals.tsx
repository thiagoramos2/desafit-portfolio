import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

interface WithdrawRequest {
  id: string;
  user_id: string;
  valor: number;
  pix_key: string;
  status: string;
  created_at: string;
  users: {
    name: string;
    email: string;
  };
}

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<WithdrawRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdraw, setSelectedWithdraw] = useState<WithdrawRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const response = await api.get('/credits/withdrawals/pending');
      setWithdrawals(response.data);
    } catch (error) {
      console.error('Erro ao buscar saques:', error);
      toast.error('Erro ao carregar saques pendentes');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (status: 'processado' | 'rejeitado') => {
    if (!selectedWithdraw) return;

    try {
      setProcessing(true);
      await api.post(`/credits/withdrawals/${selectedWithdraw.id}/process`, {
        status,
        rejectionReason: status === 'rejeitado' ? rejectionReason : undefined
      });

      toast.success(
        status === 'processado'
          ? 'Saque processado com sucesso!'
          : 'Saque rejeitado com sucesso!'
      );

      setSelectedWithdraw(null);
      setRejectionReason('');
      fetchWithdrawals();
    } catch (error) {
      console.error('Erro ao processar saque:', error);
      toast.error('Erro ao processar saque');
    } finally {
      setProcessing(false);
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
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Gerenciar Saques</h1>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Saques Pendentes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chave PIX
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {withdrawals.map((withdraw) => (
                  <tr key={withdraw.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(withdraw.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {withdraw.users.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {withdraw.users.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      R$ {withdraw.valor.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {withdraw.pix_key}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedWithdraw(withdraw)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Processar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Processamento */}
        {selectedWithdraw && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold mb-4">Processar Saque</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Usuário</p>
                  <p className="font-medium">{selectedWithdraw.users.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Valor</p>
                  <p className="font-medium">R$ {selectedWithdraw.valor.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Chave PIX</p>
                  <p className="font-medium">{selectedWithdraw.pix_key}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Motivo da Rejeição (opcional)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    rows={3}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedWithdraw(null)}
                  className="btn-outline"
                  disabled={processing}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleProcess('rejeitado')}
                  className="btn-danger"
                  disabled={processing}
                >
                  Rejeitar
                </button>
                <button
                  onClick={() => handleProcess('processado')}
                  className="btn-primary"
                  disabled={processing}
                >
                  {processing ? 'Processando...' : 'Aprovar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 