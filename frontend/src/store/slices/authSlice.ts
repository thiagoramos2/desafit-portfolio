import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Função para limpar o estado de autenticação
const clearAuthState = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  return {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  };
};

// Função para recuperar o estado inicial
const getInitialState = (): AuthState => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      return {
        user,
        token,
        isAuthenticated: true,
        loading: false,
        error: null,
      };
    } catch (error) {
      return clearAuthState();
    }
  }
  
  return clearAuthState();
};

// Estado inicial
const initialState: AuthState = getInitialState();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
      console.log('loginSuccess - Payload recebido:', action.payload);
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      console.log('loginSuccess - Estado atualizado:', { user: state.user, isAuthenticated: state.isAuthenticated });
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      Object.assign(state, clearAuthState());
      state.error = action.payload;
    },
    logout: (state) => {
      Object.assign(state, clearAuthState());
    },
    clearError: (state) => {
      state.error = null;
    },
    updateProfile: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, clearError, updateProfile } = authSlice.actions;

export default authSlice.reducer; 