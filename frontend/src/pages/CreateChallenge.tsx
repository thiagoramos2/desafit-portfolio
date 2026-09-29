import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addChallenge } from '../store/slices/challengeSlice';
import { challengeService } from '../services/api';
import { RootState } from '../store';

const schema = yup.object({
  title: yup.string()
    .required('Título é obrigatório')
    .min(3, 'Título deve ter no mínimo 3 caracteres'),
  goal: yup.string()
    .required('Meta é obrigatória')
    .min(5, 'Meta deve ter no mínimo 5 caracteres'),
  duration: yup.number()
    .required('Duração é obrigatória')
    .min(7, 'Duração mínima é de 7 dias')
    .max(90, 'Duração máxima é de 90 dias'),
  bet_amount: yup.number()
    .required('Valor da aposta é obrigatório')
    .min(10, 'Valor mínimo da aposta é R$ 10')
    .max(1000, 'Valor máximo da aposta é R$ 1.000'),
  weight_loss_goal: yup.number()
    .required('Meta de perda de peso é obrigatória')
    .min(5, 'Meta mínima é 5%')
    .max(30, 'Meta máxima é 30%'),
  start_date: yup.string()
    .required('Data de início é obrigatória')
    .test('is-future', 'A data de início deve ser futura', (value) => {
      if (!value) return false;
      const date = new Date(value);
      return date > new Date();
    })
}).required();

type FormData = yup.InferType<typeof schema>;

export default function CreateChallenge() {
  console.log('Renderizando CreateChallenge');
  
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { token, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      duration: 30,
      bet_amount: 50,
      weight_loss_goal: 10,
      start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16) // Amanhã
    },
  });

  useEffect(() => {
    console.log('CreateChallenge - useEffect', { isAuthenticated, hasToken: !!token });
    
    if (!isAuthenticated || !token) {
      console.log('Usuário não autenticado, redirecionando para login');
      navigate('/login');
      return;
    }
  }, [isAuthenticated, token, navigate]);

  const onSubmit = async (data: FormData) => {
    try {
      console.log('Iniciando criação do desafio:', data);
      setLoading(true);
      setError(null);

      const response = await challengeService.create({
        ...data,
        start_date: new Date(data.start_date)
      });
      
      console.log('Desafio criado com sucesso:', response);
      dispatch(addChallenge(response.challenge));
      navigate(`/challenges/${response.challenge.id}`);
    } catch (error: any) {
      console.error('Erro ao criar desafio:', error);
      setError(error.response?.data?.message || 'Erro ao criar desafio. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || !token) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Criar Novo Desafio
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
        <div className="card">
          <div className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Título do Desafio
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="title"
                  className="input"
                  placeholder="Ex: Perder 5kg em 30 dias"
                  {...register('title')}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="goal" className="block text-sm font-medium text-gray-700">
                Meta do Desafio
              </label>
              <div className="mt-1">
                <textarea
                  id="goal"
                  rows={3}
                  className="input"
                  placeholder="Descreva o objetivo do desafio e as regras para os participantes"
                  {...register('goal')}
                />
                {errors.goal && (
                  <p className="mt-1 text-sm text-red-600">{errors.goal.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="weight_loss_goal" className="block text-sm font-medium text-gray-700">
                Meta de Perda de Peso (%)
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  id="weight_loss_goal"
                  className="input"
                  min={5}
                  max={30}
                  step={1}
                  {...register('weight_loss_goal')}
                />
                {errors.weight_loss_goal && (
                  <p className="mt-1 text-sm text-red-600">{errors.weight_loss_goal.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                  Data de Início
                </label>
                <div className="mt-1">
                  <input
                    type="datetime-local"
                    id="start_date"
                    className="input"
                    min={new Date().toISOString().slice(0, 16)}
                    {...register('start_date')}
                  />
                  {errors.start_date && (
                    <p className="mt-1 text-sm text-red-600">{errors.start_date.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                  Duração (dias)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="duration"
                    className="input"
                    min={7}
                    max={90}
                    {...register('duration')}
                  />
                  {errors.duration && (
                    <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="bet_amount" className="block text-sm font-medium text-gray-700">
                  Valor da Aposta (R$)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="bet_amount"
                    className="input"
                    min={10}
                    max={1000}
                    step={10}
                    {...register('bet_amount')}
                  />
                  {errors.bet_amount && (
                    <p className="mt-1 text-sm text-red-600">{errors.bet_amount.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-outline"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || isSubmitting}
            className="btn-primary"
          >
            {loading ? 'Criando...' : 'Criar Desafio'}
          </button>
        </div>
      </form>

      <div className="mt-8">
        <div className="rounded-md bg-blue-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Informações importantes
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li>O desafio deve ter duração entre 7 e 90 dias</li>
                  <li>O valor da aposta deve ser entre R$ 10 e R$ 1.000</li>
                  <li>Os participantes precisarão enviar fotos como prova de progresso</li>
                  <li>O prêmio será distribuído entre os vencedores ao final do desafio</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}