import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

import Button from 'react-bootstrap/Button';
import Navbar from 'react-bootstrap/Navbar';
import Container from 'react-bootstrap/Container';

import { Order } from './features/order/Order';
import { PrintableOrder } from './features/order/PrintableOrder';
import { useAppSelector, useAppDispatch } from './app/hooks';
import {
  selectCount,
  increment
} from './features/counter/counterSlice';

import {
  reset,
} from './features/order/orderSlice';

function App() {
  const count = useAppSelector(selectCount)
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
    <>
    <Navbar bg="dark" variant="dark">
      <Container fluid>
         <Navbar.Brand>Ordine #{count}</Navbar.Brand>
      </Container>
    </Navbar>

    <main>
      <Order />


      <Container fluid className="text-center">
        <Button size="lg" onClick={handlePrint}>Conferma, paga e stampa</Button>
      </Container>
    </main>

    <div className="d-none d-print-block" ref={componentRef}>
      <PrintableOrder count={count} />
    </div>
    </>
  );
}

export default App;
