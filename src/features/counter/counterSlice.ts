import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';
import {
 getDoc,
 updateDoc,
 doc
} from '@firebase/firestore/lite';

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

const incrementWithFirestore = async (firestore: any) => {
  // TODO: try to use firestore not lite to do it atomically and protect from race conditions
  // TODO: degrade gracefully in case of network error
  const docRef = doc(firestore, 'sagre/canevara');
  const count = (await getDoc(docRef)).data()?.count;
  if (count) {
    console.log(count)
    await updateDoc(docRef, "count", count + 1);
    return count
  } else {
    return undefined
  }
}

export interface CounterState {
  value?: number;
}

export const increment = createAsyncThunk(
  'counter/increment',
  async (firestore: any) => {
    return await incrementWithFirestore(firestore)
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
