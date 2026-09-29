import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';

interface WeightProgressFormProps {
  onSubmit: (data: FormData) => Promise<void>;
  initialWeight?: number;
  weightLossGoal: number;
}

const schema = yup.object({
  currentWeight: yup
    .number()
    .required('Peso atual é obrigatório')
    .positive('Peso deve ser positivo')
    .max(500, 'Peso máximo permitido é 500kg')
    .test('reasonable-weight', 'Variação de peso muito grande', function(value) {
      const initialWeight = this.parent.initialWeight;
      if (!initialWeight || !value) return true;
      
      // Verifica se a perda de peso está dentro de limites saudáveis
      // Máximo de 15% do peso inicial em um mês
      const maxWeightLoss = initialWeight * 0.15;
      const weightLoss = initialWeight - value;
      
      return weightLoss <= maxWeightLoss;
    }),
  proofImage: yup
    .mixed()
    .required('Imagem de comprovação é obrigatória')
    .test('fileSize', 'Arquivo muito grande. Máximo 5MB', (value: any) => {
      if (!value) return true;
      return value.size <= 5000000; // 5MB
    })
    .test('fileType', 'Formato não suportado. Use JPG, PNG ou HEIC', (value: any) => {
      if (!value) return true;
      return ['image/jpeg', 'image/png', 'image/heic'].includes(value.type);
    }),
  description: yup
    .string()
    .required('Descrição é obrigatória')
    .min(10, 'Descreva com mais detalhes')
    .max(500, 'Descrição muito longa')
});

type FormInputs = yup.InferType<typeof schema>;

export default function WeightProgressForm({ onSubmit, initialWeight, weightLossGoal }: WeightProgressFormProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<FormInputs>({
    resolver: yupResolver(schema),
    defaultValues: {
      currentWeight: initialWeight
    }
  });

  const currentWeight = watch('currentWeight');
  const weightLoss = initialWeight ? (initialWeight - (currentWeight || 0)).toFixed(1) : '0';
  const progressPercentage = initialWeight ? ((Number(weightLoss) / weightLossGoal) * 100).toFixed(1) : '0';

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Criar preview da imagem
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = async (data: FormInputs) => {
    try {
      setIsSubmitting(true);
      
      const formData = new FormData();
      formData.append('currentWeight', data.currentWeight.toString());
      formData.append('proofImage', data.proofImage as File);
      formData.append('description', data.description);
      
      console.log('Enviando dados:', {
        currentWeight: data.currentWeight,
        hasImage: !!data.proofImage,
        description: data.description
      });
      
      await onSubmit(formData);
      toast.success('Progresso enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar progresso:', error);
      toast.error('Erro ao enviar progresso. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 animate-fade-in">
      <div className="form-group">
        <label className="form-label">
          Peso Atual (kg)
        </label>
        <input
          type="number"
          step="0.1"
          className="input"
          {...register('currentWeight')}
        />
        {errors.currentWeight && (
          <p className="form-error">{errors.currentWeight.message}</p>
        )}

        {initialWeight && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Peso inicial</span>
              <span className="font-medium">{initialWeight}kg</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Perda de peso</span>
              <span className="font-medium text-primary-600">{weightLoss}kg</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Progresso</span>
              <span className="font-medium text-secondary-600">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Number(progressPercentage))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">
          Foto da Balança
        </label>
        <div className="mt-1">
          <input
            type="file"
            accept="image/*"
            className="input file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium
                     file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100
                     text-sm text-gray-500"
            onChange={handleImageChange}
            {...register('proofImage')}
          />
          {errors.proofImage && (
            <p className="form-error">{errors.proofImage.message}</p>
          )}
          {imagePreview && (
            <div className="mt-4 relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-48 object-cover rounded-xl shadow-soft"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 rounded-xl" />
            </div>
          )}
        </div>
        <p className="form-helper">
          Tire uma foto clara da balança mostrando seu peso atual.
          A foto deve mostrar claramente o número na balança.
        </p>
      </div>

      <div className="form-group">
        <label className="form-label">
          Descrição
        </label>
        <textarea
          className="input"
          rows={3}
          placeholder="Descreva como foi sua semana, mudanças na dieta, exercícios realizados..."
          {...register('description')}
        />
        {errors.description && (
          <p className="form-error">{errors.description.message}</p>
        )}
      </div>

      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full"
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Enviando...
            </div>
          ) : (
            'Enviar Progresso'
          )}
        </button>
      </div>
    </form>
  );
} 