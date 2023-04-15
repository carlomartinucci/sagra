import React, { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import useWakeLock from './useWakeLock';

import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import { Order } from './features/order/Order';
import { RecapOrder, PrintableOrder, Total } from './features/order/PrintableOrder';
import { useAppSelector, useAppDispatch } from './app/hooks';
import {
  selectCount,
  increment
} from './features/counter/counterSlice';

import {
  reset,
} from './features/order/orderSlice';

function App() {
  const [navigation, setNavigation] = useState("pre")
  const count = useAppSelector(selectCount)
  const dispatch = useAppDispatch();
  const wakeLock = useWakeLock() as any;

  const [coperti, setCoperti] = useState("");
  const [isAsporto, setIsAsporto] = useState(false);
  const [tavolo, setTavolo] = useState("");

  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    content: () => componentRef.current
  });

  const handleNewOrder = () => {
    setCoperti("")
    setIsAsporto(false)
    setTavolo("")
    dispatch(increment())
    dispatch(reset())
    setNavigation("pre")
  }

  return (
    <>
    <div className="d-print-none mb-5">
      <Navbar bg="dark" variant="dark">
        <Container fluid>
          <Navbar.Brand onClick={() => setNavigation("pre")}>
            {wakeLock && !wakeLock.released ? '💡' : '📺'} Ordine #{count}
          </Navbar.Brand>
          <Nav className="me-auto">
            <Nav.Link active={navigation === "order"} disabled={["pre"].includes(navigation)} onClick={() => setNavigation("order")}>
              &gt; Menu
            </Nav.Link>
            <Nav.Link active={navigation === "recap"} disabled={["pre", "order"].includes(navigation)} onClick={() => setNavigation("recap")}>
              &gt; Riepilogo
            </Nav.Link>
            <Nav.Link active={navigation === "pay"} disabled={["pre", "order", "recap"].includes(navigation)} onClick={() => setNavigation("pay")}>
              &gt; Paga
            </Nav.Link>
            <Nav.Link active={navigation === "done"} disabled={["pre", "order", "recap", "pay"].includes(navigation)} onClick={() => setNavigation("done")}>
              &gt; Fatto
            </Nav.Link>
          </Nav>
        </Container>
      </Navbar>

      {
        navigation === "pre" ?
          <main>
            <Pre coperti={coperti} setCoperti={setCoperti} isAsporto={isAsporto} setIsAsporto={setIsAsporto} tavolo={tavolo} setTavolo={setTavolo} />

            <Container className="text-center">
              <Button size="lg" disabled={!isAsporto && (coperti==="" || tavolo==="")} onClick={() => { setNavigation("order") }}>Procedi al menù</Button>
              { (!isAsporto && (coperti==="" || tavolo==="")) && <p className="text-danger">
                Inserisci {(!isAsporto && coperti==="") && "il numero di coperti"}{!isAsporto && coperti==="" && tavolo==="" && " e "}{tavolo==="" && "il numero del tavolo"} per continuare
              </p> }
            </Container>
          </main> :
        navigation === "order" ?
          <main>
            <Order tavolo={tavolo} coperti={displayCoperti(coperti, isAsporto)} />

            <Container className="text-center">
              <Button style={{ marginBottom: 10 }}variant="secondary" size="lg" onClick={() => { setNavigation("pre") }}>Torna indietro</Button><br/>
              <Button size="lg" onClick={() => { setNavigation("recap") }}>Procedi al riepilogo</Button>
            </Container>
          </main> :
        navigation === "recap" ?
          <main>
            <RecapOrder tavolo={tavolo} coperti={displayCoperti(coperti, isAsporto)} />

            <Container className="text-center">
              <Button style={{ marginBottom: 10 }}variant="secondary" size="lg" onClick={() => { setNavigation("order") }}>Torna indietro</Button><br/>
              <Button size="lg" onClick={() => { setNavigation("pay") }}>Procedi al pagamento</Button>
            </Container>
          </main> :
        navigation === "pay" ?
          <main>
            <Total onBack={() => { setNavigation("recap") }} onConfirm={() => { handlePrint(); setNavigation("done") }} />
          </main> :
        navigation === "done" ?
          <main>
            <Container className="text-center">
              <p style={{ marginTop: 10 }}>Ordine #{count} concluso! Se c'è stato qualche problema, torna indietro o stampa di nuovo. Altrimenti, procedi con un nuovo ordine.</p>
              <Button style={{ marginBottom: 10 }} variant="secondary" size="lg" onClick={() => { setNavigation("pay") }}>Torna indietro</Button><br/>
              <Button style={{ marginBottom: 10 }} variant="secondary" size="lg" onClick={() => { handlePrint() }}>Stampa di nuovo</Button><br/>
              <Button size="lg" onClick={handleNewOrder}>Nuovo ordine</Button>
            </Container>
          </main> :
          <div>Questo non dovrebbe mai succedere. Se vedi questa schermata, ricordati la parola "{navigation}" e aggiorna la pagina. Grazie.</div>
      }
    </div>

    <div className="d-none d-print-block" ref={componentRef}>
      <PrintableOrder tavolo={tavolo} coperti={displayCoperti(coperti, isAsporto)} />
    </div>
    </>
  );
}

interface PreProps {
  coperti: string,
  setCoperti: React.Dispatch<React.SetStateAction<string>>,
  isAsporto: boolean,
  setIsAsporto: React.Dispatch<React.SetStateAction<boolean>>,
  tavolo: string,
  setTavolo: React.Dispatch<React.SetStateAction<string>>
}

const displayCoperti = (coperti: string, isAsporto: boolean): string => {
  if (isAsporto) return "Da asporto"
  if (coperti === "") return "..."
  return `${coperti} coperti`
}

function Pre({coperti, setCoperti, isAsporto, setIsAsporto, tavolo, setTavolo} : PreProps) {  
  const handleTapAsporto = () => {
    setCoperti("")
    setIsAsporto(true)
    setTavolo("")
  }

  return <Container className="my-5 text-center">
    <Row>
      <Col xs={6}>
        <h2>Quanti coperti?</h2>
        <h1>{displayCoperti(coperti, isAsporto)}</h1>
        <Tastierino value={coperti} setValue={setCoperti} onClick={ () => setIsAsporto(false) } />
        <br/>
        <Button size="lg" className="mt-3" onClick={handleTapAsporto}>Da asporto</Button>
      </Col>

      <Col xs={6}>
        <h2>Numero del tavolo</h2>
        <h1>{tavolo || "..."}</h1>
        <Tastierino value={tavolo} setValue={setTavolo} onClick={ () => setIsAsporto(false) } />
      </Col>
    </Row>
  </Container>
}

function Tastierino({ value, setValue, onClick }: { value: string, setValue: React.Dispatch<React.SetStateAction<string>>, onClick?: () => void }) {
  const handleClick = (asd: number) => () => {
    onClick && onClick()
    setValue(value => `${value}${asd}`)
  }
  const handleCanc = () => {
    onClick && onClick()
    setValue(value => "")
  }
  const handleDel = () => {
    onClick && onClick()
    setValue(value => value.slice(0,-1))
  }

  return <ButtonGroup vertical>
    <ButtonGroup size={"lg"}>
      <Button onClick={ handleClick(1) } variant="primary">1</Button>
      <Button onClick={ handleClick(2) } variant="primary">2</Button>
      <Button onClick={ handleClick(3) } variant="primary">3</Button>
    </ButtonGroup>
    <ButtonGroup size={"lg"}>
      <Button onClick={ handleClick(4) } variant="primary">4</Button>
      <Button onClick={ handleClick(5) } variant="primary">5</Button>
      <Button onClick={ handleClick(6) } variant="primary">6</Button>
    </ButtonGroup>
    <ButtonGroup size={"lg"}>
      <Button onClick={ handleClick(7) } variant="primary">7</Button>
      <Button onClick={ handleClick(8) } variant="primary">8</Button>
      <Button onClick={ handleClick(9) } variant="primary">9</Button>
    </ButtonGroup>
    <ButtonGroup size={"lg"}>
      <Button onClick={ handleCanc } variant="outline-primary">🗑</Button>
      <Button onClick={ handleClick(0) } variant="primary">0</Button>
      <Button onClick={ handleDel }variant="outline-primary">⌫</Button>
    </ButtonGroup>
  </ButtonGroup>
}

export default App;
