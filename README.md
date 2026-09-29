# DietBet - Plataforma de Desafios Fitness

Uma plataforma web progressiva (PWA) que permite usuários criarem e participarem de desafios fitness com apostas reais.

## 🚀 Tecnologias

### Backend
- Node.js + Express
- Supabase (Auth, Database, Storage)
- JWT para autenticação
- Stripe para pagamentos
- Zod para validação
- Multer para upload de arquivos

### Frontend
- React.js + Vite
- Redux Toolkit
- React Router DOM
- React Hook Form + Yup
- TailwindCSS
- PWA (Service Workers + Manifest)

## 📋 Pré-requisitos

- Node.js 18+
- NPM ou Yarn
- Conta no Supabase
- Conta no Stripe

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/dietbet.git
cd dietbet
```

2. Instale as dependências do backend:
```bash
cd backend
npm install
```

3. Instale as dependências do frontend:
```bash
cd frontend
npm install
```

4. Configure as variáveis de ambiente:

Backend (.env):
```env
PORT=3000
SUPABASE_URL=sua_url_do_supabase
SUPABASE_KEY=sua_chave_do_supabase
JWT_SECRET=seu_jwt_secret
STRIPE_SECRET_KEY=sua_chave_secreta_do_stripe
STRIPE_WEBHOOK_SECRET=seu_webhook_secret_do_stripe
FRONTEND_URL=http://localhost:5173
```

Frontend (.env):
```env
VITE_API_URL=http://localhost:3000/api
VITE_STRIPE_PUBLIC_KEY=sua_chave_publica_do_stripe
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

5. Inicie o backend:
```bash
cd backend
npm run dev
```

6. Inicie o frontend:
```bash
cd frontend
npm run dev
```

## 🗄️ Estrutura do Banco de Dados (Supabase)

### Tabela: users
- id (uuid)
- name (text)
- email (text)
- password (text)
- created_at (timestamp)

### Tabela: challenges
- id (uuid)
- title (text)
- goal (text)
- duration (integer)
- bet_amount (decimal)
- created_by (uuid, ref: users.id)
- status (text)
- created_at (timestamp)

### Tabela: challenge_participants
- id (uuid)
- user_id (uuid, ref: users.id)
- challenge_id (uuid, ref: challenges.id)
- start_weight (decimal)
- final_weight (decimal)
- proof_image (text)
- status (text)
- payment_status (text)
- created_at (timestamp)

### Tabela: payments
- id (uuid)
- user_id (uuid, ref: users.id)
- challenge_id (uuid, ref: challenges.id)
- amount (decimal)
- status (text)
- stripe_session_id (text)
- created_at (timestamp)

## 📱 Funcionalidades

1. Autenticação de Usuários
   - Registro
   - Login
   - Recuperação de senha

2. Gerenciamento de Desafios
   - Criar desafio
   - Listar desafios
   - Ver detalhes do desafio
   - Participar de desafio

3. Acompanhamento de Progresso
   - Upload de fotos
   - Registro de peso
   - Visualização de ranking

4. Sistema de Pagamentos
   - Pagamento de apostas
   - Distribuição de prêmios
   - Saques

## 🔒 Segurança

- Todas as senhas são hasheadas
- Autenticação via JWT
- Upload seguro de arquivos
- Validação de dados com Zod
- Pagamentos seguros com Stripe

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## ✨ Contribuição

1. Faça o fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request
# desafit
