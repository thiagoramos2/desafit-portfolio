require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { S3Client } = require('@aws-sdk/client-s3');

const app = express();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
// Remover quebras de linha e espaços das chaves - limpeza mais rigorosa
const supabaseKey = process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.replace(/[\r\n\s\t]+/g, '').trim() : '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ? 
  process.env.SUPABASE_SERVICE_ROLE_KEY.replace(/[\r\n\s\t]+/g, '').trim() : '';

console.log('Configurando clientes Supabase...');

// Verifique se as chaves existem
if (!supabaseUrl) {
  console.error('ERRO CRÍTICO: URL do Supabase não definida!');
  process.exit(1);
}

if (!supabaseKey) {
  console.error('ERRO CRÍTICO: Chave do Supabase não definida!');
  process.exit(1);
}

console.log('URL do Supabase: ' + supabaseUrl);
console.log('Chave do Supabase disponível: ' + (supabaseKey ? 'Sim' : 'Não'));
console.log('Chave de serviço do Supabase disponível: ' + (supabaseServiceKey ? 'Sim' : 'Não'));

// Criar cliente com a chave limpa
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false
  }
});

// Exportar o cliente para uso global
global.supabase = supabase;
console.log('Cliente Supabase normal inicializado.');

// Tenta criar um cliente Admin usando a chave do .env
try {
  if (!supabaseServiceKey) {
    console.warn('Chave de serviço não disponível no .env, cliente Admin não será inicializado.');
    // Usar o cliente normal como fallback para o Admin
    console.log('Usando o cliente normal (anônimo) como fallback para o Admin...');
    global.supabaseAdmin = supabase; // Use o cliente normal como fallback
  } else {
    console.log('Criando cliente Admin com a chave do .env...');
    
    // Verificar se a chave parece ser válida (formato JWT)
    const jwtRegex = /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/;
    if (!jwtRegex.test(supabaseServiceKey)) {
      console.error('ALERTA: A chave de serviço não parece ter o formato JWT válido!');
      console.error('Por favor, verifique se não há caracteres extras ou quebras na chave.');
    }
    
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Exportar o cliente Admin para uso global
    global.supabaseAdmin = supabaseAdmin;
    console.log('Cliente Supabase Admin inicializado com chave do .env.');
  }
} catch (error) {
  console.error('Erro ao criar cliente Supabase Admin:', error);
  console.error('Detalhes do erro:', error.message);
  // Usar o cliente normal como fallback
  global.supabaseAdmin = supabase;
  console.log('Usando o cliente normal como fallback para o Admin devido ao erro...');
}

// Verificar se os clientes foram inicializados corretamente
const testAuth = async () => {
  try {
    console.log('Testando conexão do cliente supabase normal...');
    const { data: normalTest, error: normalError } = await global.supabase.from('users').select('count').limit(1);
    
    if (normalError) {
      console.error('Erro ao testar cliente normal:', normalError.message);
      if (normalError.message.includes('Invalid API key')) {
        console.error('ALERTA: A chave API parece estar inválida. Verifique o arquivo .env');
        // Continue mesmo com erro, pois pode ser apenas restrição de permissão
      }
    } else {
      console.log('Cliente normal conectado com sucesso!');
    }
    
    // Verificar se estamos usando o cliente normal como fallback para o Admin
    const isFallbackAdmin = global.supabaseAdmin === global.supabase;
    
    if (global.supabaseAdmin && !isFallbackAdmin) {
      console.log('Testando conexão do cliente supabaseAdmin...');
      const { data: adminTest, error: adminError } = await global.supabaseAdmin.from('users').select('count').limit(1);
      
      if (adminError) {
        console.error('ERRO AO TESTAR CLIENTE ADMIN:', adminError.message);
        console.error('Detalhes do erro:', adminError);
        if (adminError.message.includes('Invalid API key')) {
          console.error('ERRO CRÍTICO: A chave service_role parece estar inválida!');
          
          // Definir o fallback como medida de último recurso
          console.log('Usando o cliente normal como último recurso para Admin...');
          global.supabaseAdmin = global.supabase;
        }
      } else {
        console.log('Cliente admin conectado com sucesso!');
      }
    } else if (isFallbackAdmin) {
      console.log('Cliente Admin está usando o cliente normal como fallback - não é necessário testar novamente.');
    } else {
      console.log('Cliente Admin não está disponível para teste.');
    }
  } catch (e) {
    console.error('Erro crítico na verificação da conexão:', e);
  }
};

// Configuração do cliente S3
const s3Config = {
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY
  },
  forcePathStyle: true // Necessário para compatibilidade com o Supabase Storage
};

console.log('Configuração Supabase:', {
  url: supabaseUrl ? 'definida' : 'não definida',
  keyConfigured: Boolean(supabaseKey)
});

console.log('Configuração S3:', {
  region: s3Config.region,
  endpoint: s3Config.endpoint ? 'definido' : 'não definido',
  accessKeyConfigured: Boolean(process.env.S3_ACCESS_KEY),
  bucket: process.env.S3_BUCKET || 'dietbet'
});

// Criar cliente S3
const s3Client = new S3Client(s3Config);

// Exporta os clientes para uso em outras partes da aplicação
global.s3Client = s3Client;

// Testar autenticação antes de continuar
testAuth().catch(e => console.error('Falha no teste de autenticação:', e));

// Inicializa o bucket de armazenamento
async function initializeStorage() {
  try {
    console.log('Verificando se podemos usar o S3 diretamente...');
    
    const { ListBucketsCommand } = require('@aws-sdk/client-s3');
    
    try {
      // Tenta listar buckets diretamente com o S3
      const command = new ListBucketsCommand({});
      const response = await s3Client.send(command);
      
      console.log('Buckets S3 disponíveis:', response.Buckets?.map(b => b.Name).join(', ') || 'nenhum');
      
      // Verifica se o bucket 'dietbet' existe
      const bucketExists = response.Buckets?.some(bucket => bucket.Name === 'dietbet');
      
      if (bucketExists) {
        console.log('Bucket S3 "dietbet" encontrado e está pronto para uso');
      } else {
        console.warn('Bucket S3 "dietbet" não encontrado! Vamos continuar usando o bucket configurado no .env:', process.env.S3_BUCKET || 'dietbet');
      }
      
    } catch (s3Error) {
      console.error('Erro ao listar buckets S3:', s3Error);
      console.error('Detalhes do erro S3:', JSON.stringify(s3Error, null, 2));
      console.log('Vamos continuar mesmo sem conseguir verificar os buckets S3');
    }
    
    console.log('Inicialização do storage concluída');
  } catch (error) {
    console.error('Erro na inicialização do storage:', error);
  }
}

// Inicializa o storage
initializeStorage();

// Configurar CORS
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://desafit.vercel.app',
    process.env.FRONTEND_URL
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.get('/', (req, res) => {
  res.json({ message: 'API DietBet funcionando!' });
});

// Importação das rotas
const authRoutes = require('./routes/auth.routes');
const challengeRoutes = require('./routes/challenge.routes');
const paymentRoutes = require('./routes/payment.routes');
const adminRoutes = require('./routes/admin.routes');
const creditsRoutes = require('./routes/credits.routes');
const commentsRoutes = require('./routes/comments');

// Uso das rotas
app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/comments', commentsRoutes);

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
}); 