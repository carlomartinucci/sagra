import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import useWakeLock from './useWakeLock';
import useDetectKeypress from './useDetectKeypress';
import logOrder from './logOrder';
// import logOrder, { download } from './logOrder';

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
import { store } from './app/store';
import {
  selectCount,
  getCount,
  increment,
  useCountPrefix,
  reset as resetCount
} from './features/counter/counterSlice';

import {
  selectProducts,
  reset as resetOrder,
  getMenu
} from './features/order/orderSlice';

function App({ firestore }: { firestore: any }) {
  const [navigation, setNavigation] = useState("pre")
  const [orderId, setOrderId] = useState(null)
  const [altCountPrefix, setAltCountPrefix] = useCountPrefix()
  useDetectKeypress("alpaca", useCallback(() => { setAltCountPrefix("") }, [setAltCountPrefix]))
  // useDetectKeypress("down", useCallback(() => { download(firestore) }, [firestore]))

  const [given, setGiven] = useState(0)
  const [mode, setMode] = useState("cash")
  const count = getCount(useAppSelector(selectCount), altCountPrefix)
  const products = useAppSelector(selectProducts)
  const dispatch = useAppDispatch();
  const wakeLock = useWakeLock() as any;
  const [coperti, setCoperti] = useState("");
  const [tavolo, setTavolo] = useState("");

  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    content: () => componentRef.current
  });

  const handleConfirm = async () => {
    if (!count) {
      await dispatch(increment(firestore))
    }
    handlePrint()

    const newOrderId = await logOrder(firestore, {
      id: orderId,
      count: store.getState().counter.value,
      products: Object.values(products).filter(product => product.quantity > 0),
      mode: mode
    })
    setOrderId(newOrderId)
    setNavigation("done")
  }

  const handleNewOrder = () => {
    setCoperti("")
    setTavolo("")
    setGiven(0)
    setMode("cash")
    setOrderId(null)
    dispatch(resetCount())
    dispatch(resetOrder())
    setNavigation("pre")
  }

  useEffect(() => {
    dispatch(getMenu())
  }, [dispatch])

  return (
    <>
    <div className="d-print-none mb-5">
      <Navbar bg="dark" variant="dark">
        <Container fluid>
          <Navbar.Brand onClick={() => setNavigation("pre")}>
            {wakeLock && !wakeLock.released ? '💡' : '📺'} { count ? `Ordine #${count}` : "Ordine ..." }
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
        !altCountPrefix ?
          <main>
            <Container className="text-center">
              <p>Scegli il prefisso per i numeri di ordine nel caso in cui venga meno la connessione internet</p>
              <Button
                style={{ marginBottom: 10 }}
                variant="secondary"
                size="lg"
                onClick={() => { setAltCountPrefix("A") }}
              >A</Button><br/>
              <Button style={{ marginBottom: 10 }} variant="secondary" size="lg" onClick={() => { setAltCountPrefix("B") }}>B</Button><br/>
            </Container>
          </main> :
        navigation === "pre" ?
          <main>
            <Pre coperti={coperti} setCoperti={setCoperti} tavolo={tavolo} setTavolo={setTavolo} />

            <Container className="text-center">
              <Button size="lg" autoFocus disabled={coperti===""} onClick={() => { setNavigation("order") }}>Procedi al menù</Button>
              { coperti==="" && <p className="text-danger">
                Inserisci il numero di coperti per continuare
              </p> }
            </Container>
          </main> :
        navigation === "order" ?
          <main>
            <Order tavolo={tavolo} coperti={displayCoperti(coperti)} />

            <Container className="text-center">
              <Button style={{ marginBottom: 10 }} variant="link" size="sm" onClick={() => { setNavigation("pre") }}>Torna indietro</Button><br/>
              <Button size="lg" autoFocus disabled={Object.values(products).every(product => product.quantity === 0)} onClick={() => { setNavigation("recap") }}>Procedi al riepilogo</Button>
            </Container>
          </main> :
        navigation === "recap" ?
          <main>
            <RecapOrder tavolo={tavolo} coperti={displayCoperti(coperti)} />

            <Container className="text-center">
              <Button style={{ marginBottom: 10 }} variant="link" size="sm" onClick={() => { setNavigation("order") }}>Torna indietro</Button><br/>
              <Button size="lg" autoFocus onClick={() => { setNavigation("pay") }}>Procedi al pagamento</Button>
            </Container>
          </main> :
        navigation === "pay" ?
          <main>
            <Total onBack={() => { setNavigation("recap") }} onConfirm={handleConfirm} given={given} setGiven={setGiven} mode={mode} setMode={setMode} />
          </main> :
        navigation === "done" ?
          <main>
            <Container className="text-center">
            { count
              ? <p style={{ marginTop: 10 }}>Ordine #{count} concluso! Se c'è stato qualche problema, torna indietro o stampa di nuovo. Altrimenti, procedi con un nuovo ordine.</p>
              : <h2 style={{ marginTop: 10 }}>Ordine concluso. Non è stato possibile inserire il numero dell'ordine: ricorda di scriverlo a mano sia sul foglio del cliente sia su quello della cucina! Se c'è stato qualche problema, torna indietro o stampa di nuovo. Altrimenti, procedi con un nuovo ordine.</h2>
            }
              <Button autoFocus style={{ marginBottom: 20 }} size="lg" onClick={handleNewOrder}>Nuovo ordine</Button><br/>
              <Button variant="link" size="sm" onClick={() => { setNavigation("pay") }}>Torna indietro</Button>
              <Button variant="secondary" size="sm" onClick={() => { handlePrint() }}>Stampa di nuovo</Button>
            </Container>
          </main> :
          <div>Questo non dovrebbe mai succedere. Se vedi questa schermata, ricordati la parola "{navigation}" e aggiorna la pagina. Grazie.</div>
      }
    </div>

    <div className="d-none d-print-block" ref={componentRef}>
      <PrintableOrder count={count} tavolo={tavolo} coperti={displayCoperti(coperti)} given={given} mode={mode} />
    </div>
    </>
  );
}

interface PreProps {
  coperti: string,
  setCoperti: React.Dispatch<React.SetStateAction<string>>,
  tavolo: string,
  setTavolo: React.Dispatch<React.SetStateAction<string>>
}

const displayCoperti = (coperti: string): string => {
  if (coperti === "") return "..."
  if (coperti === "1") return "1 coperto"
  if (/^\d+$/.test(coperti)) return `${coperti} coperti`
  return coperti
}

function Pre({coperti, setCoperti, tavolo, setTavolo} : PreProps) {
  const handleTapAsporto = () => {
    setCoperti("Da asporto")
    setTavolo("")
  }
  const handleTapAggiunta = () => { setCoperti("Aggiunta") }
  const handleTastierinoClick = () => {
    if (coperti === "Aggiunta") return
    setCoperti(coperti => coperti.replace(/\D/g,''))
  }

  return <Container className="my-5 text-center">
    <Row>
      <Col xs={6}>
        <h2>Quanti coperti?</h2>
        <h1>{displayCoperti(coperti)}</h1>
        <Tastierino value={coperti} setValue={setCoperti} onClick={() => setCoperti(coperti => coperti.replace(/\D/g,''))} />
        <br/>
        <Button size="lg" className="mt-3" onClick={handleTapAsporto}>Da asporto</Button>
        <Button size="lg" className="mt-3 mx-3" onClick={handleTapAggiunta}>Aggiunta</Button>
      </Col>

      <Col xs={6}>
        <h2>Numero del tavolo</h2>
        <h1>{tavolo || "..."}</h1>
        <Tastierino value={tavolo} setValue={setTavolo} onClick={handleTastierinoClick} />
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
