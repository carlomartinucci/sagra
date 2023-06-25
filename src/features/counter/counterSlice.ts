import { useState } from 'react'
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
  return { value, isOnline: false }
}

const incrementWithFirestore = async (firestore: any) => {
  // TODO: try to use firestore not lite to do it atomically and protect from race conditions
  const docRef = doc(firestore, `sagre/${process.env.REACT_APP_SAGRA_ID}`);
  const count = (await getDoc(docRef)).get("count");
  if (count) {
    console.log(count)
    await updateDoc(docRef, "count", count + 1);
    return { value: count, isOnline: true }
  } else {
    throw new Error("Couldn't increment with firestore");
  }
}

export interface CounterState {
  value?: number;
  isOnline: boolean;
}

export const increment = createAsyncThunk(
  'counter/increment',
  async (firestore: any) => {
    try {
      return await incrementWithFirestore(firestore)
    } catch (error) {
      console.warn(error)
      return await incrementWithLocalStorage()
    }
  }
)

const initialState: CounterState = {
  value: undefined,
  isOnline: true
}

export const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    reset: (state) => {
      state.value = undefined
      state.isOnline = true
    },
  },
  extraReducers: (builder) => {
    builder.addCase(increment.fulfilled, (state, action) => {
      state.value = action.payload.value
      state.isOnline = action.payload.isOnline
    })
  }
});

export const { reset } = counterSlice.actions;

export const selectCount = (state: RootState) => {
  const mod = state.counter.isOnline ? 10000 : 1000
  const pad = state.counter.isOnline ? 4 : 3
  return {
    count: state.counter.value ? String(state.counter.value % mod).padStart(pad, '0') : "",
    isOnline: state.counter.isOnline
  }
}

export const getCount = (countObj: {count: string, isOnline: boolean}, offlinePrefix: string | null) => {
  if (countObj.isOnline) {
    return countObj.count
  } else {
    return `${offlinePrefix}${countObj.count}`
  }
}

export const useCountPrefix = () => {
  const [prefix, setPrefix] = useState(() => window.localStorage.getItem('countPrefix'))

  function realSetPrefix(newPrefix: string) {
    window.localStorage.setItem('countPrefix', newPrefix)
    setPrefix(newPrefix)
  } 

  return [prefix, realSetPrefix] as const
}

export default counterSlice.reducer;
