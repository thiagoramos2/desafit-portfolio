import { useEffect, useState } from 'react';
import api from '../../services/api';
import { Switch } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  saldo: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddBalanceModalOpen, setIsAddBalanceModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [balanceAmount, setBalanceAmount] = useState<string>('');
  const [balanceDescription, setBalanceDescription] = useState<string>('');
  const [addingBalance, setAddingBalance] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch (error) {
      setError('Erro ao carregar usuários');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (user: User) => {
    try {
      const response = await api.put(`/admin/users/${user.id}`, {
        ...user,
        is_admin: !user.is_admin
      });
      setUsers(users.map(u => u.id === user.id ? response.data : u));
      toast.success(`${user.name} ${!user.is_admin ? 'agora é admin' : 'não é mais admin'}`);
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error('Erro ao atualizar usuário');
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      const response = await api.put(`/admin/users/${user.id}`, {
        ...user,
        is_active: !user.is_active
      });
      setUsers(users.map(u => u.id === user.id ? response.data : u));
      toast.success(`${user.name} foi ${!user.is_active ? 'ativado' : 'inativado'}`);
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error('Erro ao atualizar usuário');
    }
  };

  const handleUpdateUser = async (user: User) => {
    try {
      await api.put(`/admin/users/${user.id}`, user);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      alert('Erro ao atualizar usuário');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) {
      return;
    }

    try {
      await api.delete(`/admin/users/${userId}`);
      fetchUsers();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      alert('Erro ao excluir usuário');
    }
  };

  const openAddBalanceModal = (user: User) => {
    setSelectedUser(user);
    setBalanceAmount('');
    setBalanceDescription('');
    setIsAddBalanceModalOpen(true);
  };

  const closeAddBalanceModal = () => {
    setIsAddBalanceModalOpen(false);
    setSelectedUser(null);
  };

  const handleAddBalance = async () => {
    if (!selectedUser || !balanceAmount) return;

    try {
      setAddingBalance(true);
      const amount = parseFloat(balanceAmount);
      
      // Validação básica
      if (isNaN(amount) || amount <= 0) {
        toast.error('Por favor, insira um valor válido');
        return;
      }

      await api.post(`/admin/users/${selectedUser.id}/add-balance`, {
        amount,
        description: balanceDescription || 'Adição manual pelo administrador'
      });
      
      toast.success(`Saldo de R$ ${amount.toFixed(2)} adicionado para ${selectedUser.name}`);
      closeAddBalanceModal();
      fetchUsers(); // Recarregar para atualizar os saldos
    } catch (error) {
      console.error('Erro ao adicionar saldo:', error);
      toast.error('Erro ao adicionar saldo ao usuário');
    } finally {
      setAddingBalance(false);
    }
  };

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
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Usuários</h1>
          <p className="mt-2 text-sm text-gray-700">
            Lista de todos os usuários do sistema
          </p>
        </div>
      </div>
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                    Nome
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Email
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Saldo
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Admin
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Data de Criação
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                      {editingUser?.id === user.id ? (
                        <input
                          type="text"
                          value={editingUser.name}
                          onChange={e => setEditingUser({ ...editingUser, name: e.target.value })}
                          className="border rounded px-2 py-1"
                        />
                      ) : (
                        user.name
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {editingUser?.id === user.id ? (
                        <input
                          type="email"
                          value={editingUser.email}
                          onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                          className="border rounded px-2 py-1"
                        />
                      ) : (
                        user.email
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <span className={user.saldo > 0 ? "text-green-600 font-medium" : "text-gray-500"}>
                        R$ {user.saldo?.toFixed(2) || "0.00"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <Switch
                        checked={editingUser?.id === user.id ? editingUser.is_admin : user.is_admin}
                        onChange={() => handleToggleAdmin(user)}
                        className={`${
                          editingUser?.id === user.id ? (editingUser.is_admin ? 'bg-primary-600' : 'bg-gray-200') : (user.is_admin ? 'bg-primary-600' : 'bg-gray-200')
                        } relative inline-flex h-6 w-11 items-center rounded-full`}
                      >
                        <span className="sr-only">Alterar status de admin</span>
                        <span
                          className={`${
                            editingUser?.id === user.id ? (editingUser.is_admin ? 'translate-x-6' : 'translate-x-1') : (user.is_admin ? 'translate-x-6' : 'translate-x-1')
                          } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                        />
                      </Switch>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <Switch
                        checked={editingUser?.id === user.id ? editingUser.is_active : user.is_active}
                        onChange={() => handleToggleActive(user)}
                        className={`${
                          editingUser?.id === user.id ? (editingUser.is_active ? 'bg-green-600' : 'bg-red-600') : (user.is_active ? 'bg-green-600' : 'bg-red-600')
                        } relative inline-flex h-6 w-11 items-center rounded-full`}
                      >
                        <span className="sr-only">Alterar status de ativo</span>
                        <span
                          className={`${
                            editingUser?.id === user.id ? (editingUser.is_active ? 'translate-x-6' : 'translate-x-1') : (user.is_active ? 'translate-x-6' : 'translate-x-1')
                          } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                        />
                      </Switch>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium">
                      {editingUser?.id === user.id ? (
                        <>
                          <button
                            onClick={() => handleUpdateUser(editingUser)}
                            className="text-green-600 hover:text-green-900 mr-4"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setEditingUser(null)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingUser(user)}
                            className="text-primary-600 hover:text-primary-900 mr-2"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900 mr-2"
                          >
                            Excluir
                          </button>
                          <button
                            onClick={() => openAddBalanceModal(user)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Adicionar Saldo
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal para adicionar saldo */}
      <Transition appear show={isAddBalanceModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={closeAddBalanceModal}>
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
                    Adicionar Saldo para {selectedUser?.name}
                  </Dialog.Title>
                  <div className="mt-4">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor (R$)
                      </label>
                      <input
                        type="number"
                        value={balanceAmount}
                        onChange={(e) => setBalanceAmount(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descrição (opcional)
                      </label>
                      <input
                        type="text"
                        value={balanceDescription}
                        onChange={(e) => setBalanceDescription(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Motivo da adição de saldo"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300 focus:outline-none"
                      onClick={closeAddBalanceModal}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleAddBalance}
                      disabled={addingBalance || !balanceAmount}
                    >
                      {addingBalance ? 'Adicionando...' : 'Adicionar Saldo'}
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