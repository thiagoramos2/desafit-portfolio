// Script para o Vercel executar durante o build
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Função para executar comandos e exibir a saída
function run(command) {
  console.log(`Executando: ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf8' });
    console.log(output);
    return output;
  } catch (error) {
    console.error(`Erro ao executar: ${command}`);
    console.error(error.stdout);
    console.error(error.stderr);
    throw error;
  }
}

// Informações do ambiente
console.log('=== AMBIENTE DE BUILD ===');
console.log(`Node.js: ${process.version}`);
console.log(`Diretório atual: ${process.cwd()}`);
console.log('Listando arquivos:');
console.log(fs.readdirSync('.').join('\n'));

// Navegar para o diretório frontend
console.log('\n=== FRONTEND ===');
process.chdir('frontend');
console.log(`Diretório atual: ${process.cwd()}`);
console.log('Listando arquivos do frontend:');
console.log(fs.readdirSync('.').join('\n'));

// Instalar dependências
console.log('\n=== INSTALANDO DEPENDÊNCIAS ===');
run('npm install');

// Verificar se o Vite está instalado
console.log('\n=== VERIFICANDO VITE ===');
try {
  run('npx vite --version');
} catch (error) {
  console.log('Vite não encontrado, instalando...');
  run('npm install vite');
}

// Construir o projeto
console.log('\n=== CONSTRUINDO O PROJETO ===');
run('npm run build');

// Verificar o resultado da build
console.log('\n=== RESULTADO DA BUILD ===');
if (fs.existsSync('dist')) {
  console.log('Diretório dist criado com sucesso!');
  console.log('Conteúdo do diretório dist:');
  console.log(fs.readdirSync('dist').join('\n'));
} else {
  console.error('ERRO: Diretório dist não foi criado!');
  process.exit(1);
}

console.log('\n=== BUILD CONCLUÍDA COM SUCESSO ==='); 