import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

export interface CounterState {
  value: number;
}

const initialState: (() => CounterState) = () => {
  const storageValue = window.localStorage.getItem('count')
  let value: number
  if (storageValue !== null) {
    value = Number(storageValue) % 10000
  } else {
    value = Math.floor(Math.random() * 10000)
    window.localStorage.setItem('count', `${value}`)
  }
  return { value }
};

export const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    increment: (state) => {
      state.value += 1;
      window.localStorage.setItem('count', `${state.value}`)
    },
    set: (state, action: PayloadAction<number>) => {
      state.value = action.payload;
      window.localStorage.setItem('count', `${state.value}`)
    },
  },
});

export const { increment, set } = counterSlice.actions;

export const selectCount = (state: RootState) => String(state.counter.value % 10000).padStart(4, '0');

export default counterSlice.reducer;
