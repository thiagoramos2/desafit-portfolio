import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import WeightReviewCard from '../components/WeightReviewCard';

export default function Landing() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-teal-100 to-white">
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
          <div className="mx-auto max-w-2xl flex-shrink-0 lg:mx-0 lg:max-w-xl lg:pt-8">
            <h1 className="mt-10 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Aposte em você mesmo e ganhe dinheiro perdendo peso
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Junte-se a uma comunidade motivada, estabeleça metas reais e ganhe dinheiro enquanto transforma sua saúde.
            </p>
            <div className="mt-10 flex items-center gap-x-6">
              {isAuthenticated ? (
                <Link
                  to="/explore"
                  className="rounded-md bg-teal-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-500"
                >
                  Explorar Desafios
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="rounded-md bg-teal-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-500"
                  >
                    Começar Agora
                  </Link>
                  <Link
                    to="/login"
                    className="text-sm font-semibold leading-6 text-gray-900"
                  >
                    Já tem conta? <span aria-hidden="true">→</span>
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none xl:ml-32">
            <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
              <div className="relative">
                <WeightReviewCard
                  status="reviewing"
                />
                <div className="mt-8">
                  <WeightReviewCard
                    status="approved"
                    imageUrl="https://fniuceuuvxxbabcyjhtx.supabase.co/storage/v1/object/public/app-assets/referee-1.jpg"
                  />
                </div>
                <div className="mt-8">
                  <WeightReviewCard
                    status="feedback"
                    imageUrl="https://fniuceuuvxxbabcyjhtx.supabase.co/storage/v1/object/public/app-assets/referee-2.jpg"
                    message="Continue assim! Sua dedicação está fazendo a diferença."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Seção de Resultados */}
      <div className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Resultados Reais
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Conheça algumas das transformações incríveis da nossa comunidade
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card de Transformação 1 */}
            <div className="overflow-hidden rounded-2xl bg-white shadow">
              <div className="relative h-64">
                <img
                  src="/images/transformations/transformation-1.jpg"
                  alt="Transformação 1"
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
                  <p className="text-white font-semibold">Maria perdeu 25kg</p>
                  <p className="text-teal-300">Ganhou R$ 2.500</p>
                </div>
              </div>
            </div>

            {/* Card de Transformação 2 */}
            <div className="overflow-hidden rounded-2xl bg-white shadow">
              <div className="relative h-64">
                <img
                  src="/images/transformations/transformation-2.jpg"
                  alt="Transformação 2"
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
                  <p className="text-white font-semibold">João perdeu 30kg</p>
                  <p className="text-teal-300">Ganhou R$ 3.000</p>
                </div>
              </div>
            </div>

            {/* Card de Transformação 3 */}
            <div className="overflow-hidden rounded-2xl bg-white shadow">
              <div className="relative h-64">
                <img
                  src="/images/transformations/transformation-3.jpg"
                  alt="Transformação 3"
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
                  <p className="text-white font-semibold">Ana perdeu 20kg</p>
                  <p className="text-teal-300">Ganhou R$ 1.800</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Como Funciona */}
      <div className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Como Funciona
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Três passos simples para começar sua jornada de transformação
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {/* Passo 1 */}
              <div className="relative flex flex-col items-center text-center">
                <div className="mb-8 h-48 w-full overflow-hidden rounded-2xl">
                  <img
                    src="/images/steps/step-1.jpg"
                    alt="Aposte em Você"
                    className="h-full w-full object-cover"
                  />
                </div>
                <dt className="text-xl font-semibold leading-7 text-gray-900">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-teal-600 text-white text-2xl font-bold">
                    1
                  </div>
                  Aposte em Você
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Escolha seu desafio e faça uma aposta em si mesmo
                  </p>
                  <p className="mt-4">
                    <span className="text-2xl font-bold text-teal-600">R$ 150</span>
                    <span className="block text-sm text-gray-600">aposta média</span>
                  </p>
                </dd>
              </div>

              {/* Passo 2 */}
              <div className="relative flex flex-col items-center text-center">
                <div className="mb-8 h-48 w-full overflow-hidden rounded-2xl">
                  <img
                    src="/images/steps/step-2.jpg"
                    alt="Alcance sua Meta"
                    className="h-full w-full object-cover"
                  />
                </div>
                <dt className="text-xl font-semibold leading-7 text-gray-900">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-teal-600 text-white text-2xl font-bold">
                    2
                  </div>
                  Alcance sua Meta
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Registre seu progresso com fotos e pesagens verificadas
                  </p>
                  <p className="mt-4">
                    <span className="text-2xl font-bold text-teal-600">12h</span>
                    <span className="block text-sm text-gray-600">tempo médio de verificação</span>
                  </p>
                </dd>
              </div>

              {/* Passo 3 */}
              <div className="relative flex flex-col items-center text-center">
                <div className="mb-8 h-48 w-full overflow-hidden rounded-2xl">
                  <img
                    src="/images/steps/step-3.jpg"
                    alt="Receba seu Prêmio"
                    className="h-full w-full object-cover"
                  />
                </div>
                <dt className="text-xl font-semibold leading-7 text-gray-900">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-teal-600 text-white text-2xl font-bold">
                    3
                  </div>
                  Receba seu Prêmio
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Ganhe sua aposta de volta mais uma parte do prêmio total
                  </p>
                  <p className="mt-4">
                    <span className="text-2xl font-bold text-teal-600">2x</span>
                    <span className="block text-sm text-gray-600">retorno médio</span>
                  </p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* CTA Final com Imagem de Fundo */}
      <div className="bg-white">
        <div className="mx-auto max-w-7xl py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="relative isolate overflow-hidden bg-teal-900 px-6 py-24 text-center shadow-2xl sm:rounded-3xl sm:px-16">
            <div className="absolute inset-0 -z-10">
              <img
                src="/images/cta-background.jpg"
                alt=""
                className="h-full w-full object-cover opacity-20"
              />
            </div>
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Comece sua transformação hoje
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
              Junte-se a milhares de pessoas que já estão alcançando seus objetivos e ganhando dinheiro no processo.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                to="/register"
                className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-teal-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Criar Conta Grátis
              </Link>
              <Link
                to="/explore"
                className="text-sm font-semibold leading-6 text-white"
              >
                Ver Desafios <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 