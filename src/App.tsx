import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

import { Order } from './features/order/Order';
import { PrintableOrder } from './features/order/PrintableOrder';
import { useAppSelector, useAppDispatch } from './app/hooks';
import {
  selectCount,
  increment
} from './features/counter/counterSlice';

import {
  reset,
  selectProducts,
} from './features/order/orderSlice';

function App() {
  const count = useAppSelector(selectCount)
  const products = useAppSelector(selectProducts)
  const dispatch = useAppDispatch();

  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    onAfterPrint: () => {
      dispatch(increment())
      dispatch(reset())
    }
  });

  return (
    <main>
      <div>{count}</div>
      <Order />

      <div className="d-none d-print-block" ref={componentRef}>
        <PrintableOrder count={count} />
      </div>

      <button onClick={handlePrint}>Print this out!</button>
    </main>
  );
}

export default App;
