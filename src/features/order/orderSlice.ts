import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

export interface OrderState {
  products: { [key: string]: Product };
}

export interface Product {
  name: string | string[],
  color: string,
  quantity: number,
  euroCents: number,
  notes: string
}

export function displayEuroCents(euroCents: number){
  return '\u20AC' + (euroCents / 100).toLocaleString('it-IT', { minimumFractionDigits: 2 });;
};

const initialState: OrderState = {
  products: {
    tordelli: {
      name: "Tordelli al ragù",
      color: "#e52421",
      quantity: 0,
      euroCents: 700,
      notes: ""
    },
    pastaripiena: {
      name: "Pasta ripiena al forno",
      color: "#ffcc00",
      quantity: 0,
      euroCents: 700,
      notes: ""
    },
    lasagne: {
      name: "Lasagne di mare al forno",
      color: "#2a4b9b",
      quantity: 0,
      euroCents: 700,
      notes: ""
    },
    girelline: {
      name: "Girelline ricotta e spinaci",
      color: "#339933",
      quantity: 0,
      euroCents: 700,
      notes: ""
    },
    stinco: {
      name: "Stinco con patate",
      color: "#7d4e24",
      quantity: 0,
      euroCents: 1200,
      notes: ""
    },
    mezzostinco: {
      name: "Mezzo stinco con patate",
      color: "#fdeb19",
      quantity: 0,
      euroCents: 700,
      notes: ""
    },
    cozze: {
      name: "Cozze ripiene",
      color: "#00005a",
      quantity: 0,
      euroCents: 700,
      notes: ""
    },
    freddo: {
      name: ["Piatto freddo: bresaola, rucola, ", "scaglie di parmigiano, aceto balsamico"],
      color: "#880000",
      quantity: 0,
      euroCents: 700,
      notes: ""
    },
    riso: {
      name: "Torta di riso",
      color: "#ea5b0c",
      quantity: 0,
      euroCents: 400,
      notes: ""
    },
    cioccolato: {
      name: "Torta al cioccolato",
      color: "#432918",
      quantity: 0,
      euroCents: 400,
      notes: ""
    },
  },
};

export const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    increment: (state, action: PayloadAction<string>) => {
      if (state.products[action.payload] !== null) {
        state.products[action.payload].quantity += 1
      }
    },
    decrement: (state, action: PayloadAction<string>) => {
      if (state.products[action.payload] !== null && state.products[action.payload].quantity > 0) {
        state.products[action.payload].quantity -= 1
      }
    },
    editNotes: (state, action: PayloadAction<{key: string, notes: string}>) => {
      if (state.products[action.payload.key] !== null) {
        state.products[action.payload.key].notes = action.payload.notes
      }
    },
    reset: (state) => {
      state.products = initialState.products
    }
  },
});

export const { increment, decrement, editNotes, reset } = orderSlice.actions;

export const selectProducts = (state: RootState) => state.order.products;

export default orderSlice.reducer;
