import React from 'react';

interface WeightReviewCardProps {
  status: 'reviewing' | 'approved' | 'feedback';
  message?: string;
  imageUrl?: string;
}

export default function WeightReviewCard({ status, message, imageUrl }: WeightReviewCardProps) {
  return (
    <div className="card hover:scale-[1.02] transition-transform duration-200">
      {status === 'reviewing' && (
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-primary-600 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-primary-600">
            Árbitros estão analisando sua pesagem
          </h3>
          <p className="mt-2 text-gray-600">
            Retornaremos com o resultado em até 12 horas.
          </p>
        </div>
      )}

      {status === 'approved' && (
        <div className="p-8">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-xl font-medium text-green-600">
                Recebemos!
              </h3>
              <p className="text-gray-600">
                Nossos Árbitros analisarão sua pesagem e retornarão em até 12 horas.
              </p>
            </div>
          </div>
        </div>
      )}

      {status === 'feedback' && (
        <div className="p-8">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-secondary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <div className="flex items-center">
                <span className="text-xl font-medium text-secondary-600">
                  Essa foto está ótima, bom trabalho!
                </span>
              </div>
              {message && (
                <p className="mt-2 text-gray-600">{message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="px-8 py-4 bg-gray-50 border-t rounded-b-2xl">
        <button className="text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors duration-200 flex items-center">
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Dúvidas? Entre em contato com um Árbitro
        </button>
      </div>
    </div>
  );
} 