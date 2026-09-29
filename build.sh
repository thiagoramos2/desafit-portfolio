#!/bin/bash

# Exibir informações do ambiente
echo "Ambiente de build:"
echo "Node.js $(node -v)"
echo "NPM $(npm -v)"
echo "Diretório atual: $(pwd)"
echo "Listando arquivos:"
ls -la

# Navegar para o diretório frontend
echo "Navegando para o diretório frontend..."
cd frontend

# Verificar se estamos no diretório correto
echo "Agora em: $(pwd)"
echo "Listando arquivos do frontend:"
ls -la

# Instalar dependências
echo "Instalando dependências..."
npm install

# Verificar se o Vite está instalado
echo "Verificando instalação do Vite:"
npx vite --version

# Construir o projeto
echo "Construindo o projeto com Vite..."
npm run build

# Verificar o resultado da build
echo "Build concluído. Conteúdo do diretório dist:"
ls -la dist

echo "Build concluído com sucesso!" 