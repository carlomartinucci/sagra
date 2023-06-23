import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

const incrementWithLocalStorage = async () => {
  // get the current number
  const storageValue = window.localStorage.getItem('count')
  let value: number
  if (storageValue !== null) {
    value = Number(storageValue) % 10000
  } else {
    value = Math.floor(Math.random() * 10000)
    window.localStorage.setItem('count', `${value}`)
  }

  // increment it
  window.localStorage.setItem('count', `${value + 1}`)

  // return the original, non incremented number
  return value
}

export interface CounterState {
  value?: number;
}

export const increment = createAsyncThunk(
  'counter/increment',
  async () => {
    return await incrementWithLocalStorage()
  }
)

const initialState: CounterState = {
  value: undefined
}

export const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    reset: (state) => {
      state.value = undefined;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(increment.fulfilled, (state, action) => {
      state.value = action.payload
    })
  }
});

export const { reset } = counterSlice.actions;

export const selectCount = (state: RootState) => state.counter.value ? String(state.counter.value % 10000).padStart(4, '0') : "";

export default counterSlice.reducer;
