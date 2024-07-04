import React from 'react';

import { useAppSelector } from '../../app/hooks';
import {
  selectProducts,
  displayEuroCents,
} from './orderSlice';

import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import ToggleButton from 'react-bootstrap/ToggleButton';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Image from 'react-bootstrap/Image'

import Table from 'react-bootstrap/Table';

import cent50 from '../../images/050.jpeg'
import eur1 from '../../images/1.jpeg'
import eur2 from '../../images/2.jpeg'
import eur5 from '../../images/5.jpeg'
import eur10 from '../../images/10.jpeg'
import eur20 from '../../images/20.jpeg'
import eur50 from '../../images/50.jpeg'
import eur100 from '../../images/100.jpeg'
import headerCucina from '../../images/canevara-summer-2024.jpeg'

export function Total({ onBack, onConfirm, given, setGiven, mode, setMode }: { onBack: () => void, onConfirm: () => void, given: number, setGiven: React.Dispatch<React.SetStateAction<number>>, mode: string, setMode: React.Dispatch<React.SetStateAction<string>> }) {
  const products = useAppSelector(selectProducts);
  const total = Object.values(products).reduce((total, product) => total + product.euroCents * product.quantity, 0)

  const resto = mode === "cash" ? given - total : 0

  return <>
    <Container fluid style={{paddingTop: 30, textAlign: "center"}} >
      <h3>Totale da pagare:</h3>
      <h2>{displayEuroCents(total)}</h2>

      <h3 style={{paddingTop: 30}}>Totale pagato:</h3>
      <h2>{mode === "cash" ? displayEuroCents(given) : mode === "POS" ? displayEuroCents(total) : "-"}</h2>

      <Button variant="outline-secondary" className="mt-3" onClick={() => { setGiven(0) }}>Cancella</Button>
      <ButtonGroup className="mt-3 mx-3" >
        <ToggleButton id="mode-cash" value="cash" type="radio" variant={mode === "cash" ? "primary" : "outline-primary"} size="lg" checked={mode === "cash"} onChange={(e) => setMode(e.target.value)}>Contanti</ToggleButton>
        <ToggleButton id="mode-POS" value="POS" type="radio" variant={mode === "POS" ? "primary" : "outline-primary"} size="lg" checked={mode === "POS"} onChange={(e) => setMode(e.target.value)}>POS</ToggleButton>
        <ToggleButton id="mode-servizio" value="servizio" type="radio" variant={mode === "servizio" ? "primary" : "outline-primary"} size="lg" checked={mode === "servizio"} onChange={(e) => setMode(e.target.value)}>Servizio</ToggleButton>
      </ButtonGroup>

      <Row style={{paddingTop: 10}}>
        <Col xs={3} />
        <Col xs={2} className="d-flex justify-content-center align-items-center">
          <Image style={{margin: "auto"}} roundedCircle thumbnail src={cent50} alt={displayEuroCents(50)} onClick={() => { setGiven((given) => given + 50) }} />
        </Col>
        <Col xs={2} className="d-flex justify-content-center align-items-center">
          <Image style={{margin: "auto"}} roundedCircle thumbnail src={eur1} alt={displayEuroCents(100)} onClick={() => { setGiven((given) => given + 100) }} />
        </Col>
        <Col xs={2} className="d-flex justify-content-center align-items-center">
          <Image style={{margin: "auto"}} roundedCircle thumbnail src={eur2} alt={displayEuroCents(200)} onClick={() => { setGiven((given) => given + 200) }} />
        </Col>
      </Row>

      <Row>
        <Col xs={4} className="d-flex justify-content-center align-items-center">
          <Image style={{margin: "auto"}} thumbnail src={eur5} alt={displayEuroCents(500)} onClick={() => { setGiven((given) => given + 500) }} />
        </Col>
        <Col xs={4} className="d-flex justify-content-center align-items-center">
          <Image style={{margin: "auto"}} thumbnail src={eur10} alt={displayEuroCents(1000)} onClick={() => { setGiven((given) => given + 1000) }} />
        </Col>
        <Col xs={4} className="d-flex justify-content-center align-items-center">
          <Image style={{margin: "auto"}} thumbnail src={eur20} alt={displayEuroCents(2000)} onClick={() => { setGiven((given) => given + 2000) }} />
        </Col>
      </Row>

      <Row>
        <Col xs={4} className="d-flex justify-content-center align-items-center">
          <Image style={{margin: "auto"}} thumbnail src={eur50} alt={displayEuroCents(5000)} onClick={() => { setGiven((given) => given + 5000) }} />
        </Col>
        <Col xs={4} className="d-flex justify-content-center align-items-center">
          <Image style={{margin: "auto"}} thumbnail src={eur100} alt={displayEuroCents(10000)} onClick={() => { setGiven((given) => given + 10000) }} />
        </Col>
      </Row>

      <h3 style={{paddingTop: 30}}>Resto:</h3>
      {resto >= 0 ? <h2>{displayEuroCents(resto)}</h2> : <h3>(mancano {displayEuroCents(-resto)})</h3>}
    </Container>

    <Container style={{paddingTop: 30}} className="text-center">
      <Button style={{ marginRight: 20 }} variant="link" size="sm" onClick={onBack}>Torna indietro</Button>
      <Button size="lg" onClick={onConfirm} disabled={resto < 0}>Conferma e stampa</Button>
      { resto < 0 && <p className="text-danger">mancano {displayEuroCents(-resto)}, indica il pagamento del cliente per continuare</p> }
    </Container>
  </>
}

export function RecapOrder({ coperti, tavolo }: { coperti: string, tavolo: string }) {
  const products = useAppSelector(selectProducts);

  const totalEuroCents = Object.values(products).reduce((total, product) => total + product.euroCents * product.quantity, 0)

  return <Container fluid>
    <Row><Col className="text-center text-bg-info mb-3"><h3 className="my-2">Tavolo {tavolo}. {coperti}</h3></Col></Row>
    { Object.entries(products).filter(item => item[1].quantity > 0).map(([key, product]) => {
      return <Row key={key} className={product.quantity === 0 ? "text-muted" : ""}>
        <Col xs={12} className="text-center">
          <h4 className={product.notes ? "mb-0" : ""}>{product.quantity} {product.name}</h4>
          {product.notes && <div className="mb-2">(Note: <span style={{ fontWeight: "bold" }}>{product.notes}</span>)</div>}
        </Col>
      </Row>
    })}
    <Row>
      <Col className="text-end">Totale: {displayEuroCents(totalEuroCents)}</Col>
    </Row>
  </Container>

}

export function PrintableOrder({ count, coperti, tavolo, given, mode }: { count: string, coperti: string, tavolo: string, given: number, mode: string }) {
  return <>
    <CucinaOrder count={count} coperti={coperti} tavolo={tavolo} given={given} mode={mode} />

    <Break/>

    <CucinaOrder count={count} coperti={coperti} tavolo={tavolo} given={given} mode={mode} />
  </>
}

export function CucinaOrder({ count, coperti, tavolo, given, mode }: { count: string, coperti: string, tavolo: string, given: number, mode: string }) {
  const products = useAppSelector(selectProducts);
  // const orderedProducts = Object.values(products).sort((p1, p2) => p1.order - p2.order)
  const cucinaProducts = Object.values(products).filter(product => product.quantity > 0)
  const cucinaNotesCount = Object.values(products).filter(product => product.notes).length
  const totalEuroCents = Object.values(products).reduce((total, product) => total + product.euroCents * product.quantity, 0)

  const isCucinaFontBig = cucinaProducts.length + cucinaNotesCount / 3 <= 9
  const isCucinaFontSmall = cucinaProducts.length >= 13

  return <Container fluid style={{ lineHeight: 1.5 }}>
    <div style={{position: 'relative'}}>
      <div style={{position: "absolute", padding: "4.2vh 30vw 0 0", margin: 0, width: "100%", textAlign: "center"}}>
        <h2 style={{ padding: 0, margin: 0, fontSize: "5vw" }}>
          {coperti}
        </h2>
      </div>
      <div style={{position: "absolute", padding: "5vh 30vw 0 0", margin: 0, width: "100%", textAlign: "center"}}>
        <h1 style={{ fontSize: "20vw", margin: 0, padding: 0 }}>{count}</h1>
      </div>
      <div style={{position: "absolute", padding: "20.5vh 30vw 0 0", margin: 0, width: "100%", textAlign: "center"}}>
        <h2 style={{ padding: 0, margin: 0, fontSize: "2.5vw" }}>
          {(new Date()).toLocaleTimeString()} {"- "}
          {tavolo ? `Tavolo ${tavolo} - ` : ""}
          {displayEuroCents(totalEuroCents)}
          {mode === "POS" ? ` (POS)` : ""}
        </h2>
      </div>
    </div>
    <Image style={{width: "100%"}} src={headerCucina} alt="Sagra di Canevara (MS)" />

    <Table bordered size="sm" style={{ margin: 0, padding: 0 }}>
      <tbody>
        { cucinaProducts.map((product) => {
          return <tr key={product.name} style={{ margin: 0 }}>
            <td className="text-center" style={{ verticalAlign: "middle", padding: "0 1vh" }}>
              <span style={{ fontSize: isCucinaFontBig ? "6vw" : isCucinaFontSmall ? "3.5vw" : "4.5vw", fontWeight: "bold" }}>{product.quantity}</span>
            </td>
            <td style={{ verticalAlign: "middle", padding: "0 1vh" }}>
              <span style={{ fontSize: isCucinaFontBig ? "4.4vw" : isCucinaFontSmall ? "2.8vw" : "3.2vw"}}>{product.name}</span>
              {product.notes ? (isCucinaFontBig ? <br/> : " ") : ""}
              {product.notes ? <span style={{ fontSize: isCucinaFontBig ? "3.6vw" : isCucinaFontSmall ? "1.8vw" : "2.3vw"}}>(Note: <span style={{ fontWeight: "bold" }}>{product.notes}</span>)</span> : ""}
            </td>
          </tr>
        })}
      </tbody>
    </Table>

    <Row>
      <Col style={{ padding: 0, margin: "1vh 2vh", fontSize: "2.5vw" }}>* preparato da noi e congelato prima della cottura</Col>
    </Row>
  </Container>
}


function Break() {
  return <div style={{clear: "both", pageBreakAfter: "always"}}></div>
}

