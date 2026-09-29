import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Participant {
  user_id: string;
  start_weight: number;
  final_weight: number;
  proof_image: string;
  status: 'active' | 'completed' | 'failed';
}

interface Challenge {
  id: string;
  title: string;
  goal: string;
  duration: number;
  bet_amount: number;
  created_by: {
    name: string;
  };
  participants: Participant[];
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
}

interface ChallengeState {
  challenges: Challenge[];
  currentChallenge: Challenge | null;
  loading: boolean;
  error: string | null;
}

const initialState: ChallengeState = {
  challenges: [],
  currentChallenge: null,
  loading: false,
  error: null,
};

const challengeSlice = createSlice({
  name: 'challenges',
  initialState,
  reducers: {
    fetchChallengesStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchChallengesSuccess: (state, action: PayloadAction<Challenge[]>) => {
      state.loading = false;
      state.challenges = action.payload;
    },
    fetchChallengesFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    setCurrentChallenge: (state, action: PayloadAction<Challenge>) => {
      state.currentChallenge = action.payload;
    },
    clearCurrentChallenge: (state) => {
      state.currentChallenge = null;
    },
    addChallenge: (state, action: PayloadAction<Challenge>) => {
      state.challenges.push(action.payload);
    },
    updateChallenge: (state, action: PayloadAction<Challenge>) => {
      const index = state.challenges.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.challenges[index] = action.payload;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchChallengesStart,
  fetchChallengesSuccess,
  fetchChallengesFailure,
  setCurrentChallenge,
  clearCurrentChallenge,
  addChallenge,
  updateChallenge,
  clearError,
} = challengeSlice.actions;

export default challengeSlice.reducer; 