// src/app.js - VERSÃO CORRIGIDA
import { state, MEALS, loadPatientsFromDB, loadFoodsFromDB } from './state.js';
import { renderMeals, renderSummary } from './ui.js';
import { openPatientManager, initPatientUI } from './patients.js';
import { savePatientToPdfContext } from './pdf.js';

// Initialize Supabase
const supabaseUrl = 'https://pghhuzujutcqbvbctdef.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnaGh1enVqdXRjcWJ2YmN0ZGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzMzM0NzIsImV4cCI6MjA3ODkwOTQ3Mn0.nEvaIDWBt0Ba5_pdDmVpOsraAu909w0mdMN6jbbgWBY';

// Garantir que Supabase está disponível
if (window.supabase) {
  window.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
  console.log('Supabase inicializado');
} else {
  console.error('Supabase não está disponível');
}

let currentUser = null;

// Função para mostrar a tela de login
function showLogin() {
  const loginScreen = document.getElementById('loginScreen');
  const app = document.getElementById('app');
  if (loginScreen) loginScreen.classList.remove('hidden');
  if (app) app.classList.add('hidden');
}

// Função para mostrar a aplicação
function showApp() {
  const loginScreen = document.getElementById('loginScreen');
  const app = document.getElementById('app');
  if (loginScreen) loginScreen.classList.add('hidden');
  if (app) app.classList.remove('hidden');
}

// Configura os handlers de login e cadastro usando delegação de eventos
function setupAuthHandlers() {
  // Delegação de eventos para os tabs
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('login-tab')) {
      const target = e.target.dataset.tab;
      // Remove active de todas as tabs
      document.querySelectorAll('.login-tab').forEach(tab => tab.classList.remove('active'));
      // Adiciona active à tab clicada
      e.target.classList.add('active');
      // Esconde todos os forms
      document.querySelectorAll('.login-form').forEach(form => form.classList.add('hidden'));
      // Mostra o form correspondente
      const targetForm = document.getElementById(`${target}Form`);
      if (targetForm) targetForm.classList.remove('hidden');
    }
  });

  // Delegação de eventos para o formulário de login
  document.addEventListener('submit', async (e) => {
    if (e.target.id === 'loginForm') {
      e.preventDefault();
      await handleLogin();
    }
  });

  // Delegação de eventos para o formulário de cadastro
  document.addEventListener('submit', async (e) => {
    if (e.target.id === 'registerForm') {
      e.preventDefault();
      await handleRegister();
    }
  });
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    alert('Por favor, preencha todos os campos.');
    return;
  }

  const button = document.querySelector('#loginForm button');
  const originalText = button.innerHTML;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
  button.disabled = true;

  try {
    console.log('Tentando login com:', email);
    
    if (!window.supabase) {
      throw new Error('Supabase não está disponível');
    }

    const { data, error } = await window.supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) throw error;

    console.log('Login bem-sucedido:', data.user);
    currentUser = data.user;
    state.currentUser = data.user;
    showApp();
    await initializeApp();
  } catch (error) {
    console.error('Login error:', error);
    alert('Erro ao fazer login: ' + error.message);
  } finally {
    button.innerHTML = originalText;
    button.disabled = false;
  }
}

async function handleRegister() {
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirmPassword').value;

  if (!name || !email || !password || !confirmPassword) {
    alert('Por favor, preencha todos os campos.');
    return;
  }

  if (password !== confirmPassword) {
    alert('As senhas não coincidem.');
    return;
  }

  if (password.length < 6) {
    alert('A senha deve ter pelo menos 6 caracteres.');
    return;
  }

  const button = document.querySelector('#registerForm button');
  const originalText = button.innerHTML;
  button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando conta...';
  button.disabled = true;

  try {
    const { data, error } = await window.supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          name: name
        }
      }
    });

    if (error) throw error;

    alert('Conta criada com sucesso! Você já pode fazer login.');
    // Mudar para a aba de login
    document.querySelector('.login-tab[data-tab="login"]').click();
    document.getElementById('loginEmail').value = email;
    // Limpar formulário de cadastro
    document.getElementById('registerForm').reset();
  } catch (error) {
    console.error('Registration error:', error);
    alert('Erro ao criar conta: ' + error.message);
  } finally {
    button.innerHTML = originalText;
    button.disabled = false;
  }
}

async function initializeApp() {
  try {
    await loadFoodsFromDB();
    await loadPatientsFromDB();
    initPatientUI();
    setupAppHandlers();
    
    // Atualizar avatar do usuário
    const userAvatar = document.getElementById('userAvatar');
    if (currentUser && currentUser.email) {
      userAvatar.innerHTML = currentUser.email.charAt(0).toUpperCase();
    }
  } catch (error) {
    console.error('Error initializing app:', error);
    alert('Erro ao inicializar a aplicação: ' + error.message);
  }
}

function setupAppHandlers() {
  // Logout
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await window.supabase.auth.signOut();
    currentUser = null;
    state.currentUser = null;
    showLogin();
    // Limpar formulários de login
    document.getElementById('loginForm').reset();
  });

  // Outros botões
  document.getElementById('managePatientsBtn').addEventListener('click', () => openPatientManager());
  document.getElementById('exportPdfBtn').addEventListener('click', savePatientToPdfContext);
  document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm('Limpar todas as refeições?')) {
      MEALS.forEach(m => state.meals[m] = []);
      renderMeals();
    }
  });
}

// Verifica a autenticação ao carregar a página
async function init() {
  try {
    console.log('Inicializando aplicação...');
    
    if (!window.supabase) {
      throw new Error('Supabase não está disponível');
    }

    const { data: { session } } = await window.supabase.auth.getSession();
    console.log('Sessão encontrada:', session);
    
    if (session) {
      currentUser = session.user;
      state.currentUser = session.user;
      showApp();
      await initializeApp();
    } else {
      showLogin();
    }
    setupAuthHandlers();
  } catch (error) {
    console.error('Error during initialization:', error);
    showLogin();
  }
}

// Inicializa a aplicação
document.addEventListener('DOMContentLoaded', init);

// Escuta mudanças na autenticação
window.supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session);
  if (event === 'SIGNED_OUT') {
    currentUser = null;
    state.currentUser = null;
    showLogin();
  }
});