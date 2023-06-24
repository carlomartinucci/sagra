import React from 'react';

import { useAppSelector } from '../../app/hooks';
import {
  selectProducts,
  displayEuroCents,
} from './orderSlice';

import Button from 'react-bootstrap/Button';
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
import headerCucina from '../../images/canevara-summer-2023.png'
import headerCliente from '../../images/intestazione-per-clienti-2023.png'

export function Total({ onBack, onConfirm, given, setGiven }: { onBack: () => void, onConfirm: () => void, given: number, setGiven: React.Dispatch<React.SetStateAction<number>> }) {
  const products = useAppSelector(selectProducts);
  const total = Object.values(products).reduce((total, product) => total + product.euroCents * product.quantity, 0)

  const resto = given - total

  return <>
    <Container fluid style={{paddingTop: 30, textAlign: "center"}} >
      <h3>Totale da pagare:</h3>
      <h2>{displayEuroCents(total)}</h2>

      <h3 style={{paddingTop: 30}}>Totale pagato:</h3>
      <h2>{displayEuroCents(given)}</h2>

      <Row style={{paddingTop: 30}}>
        <Button variant="outline-primary" onClick={() => { setGiven(0) }}>Cancella</Button>
      </Row>

      <Row style={{paddingTop: 10}}>
        <Col xs={4} className="d-flex justify-content-center align-items-center">
          <Image style={{margin: "auto"}} roundedCircle thumbnail src={cent50} alt={displayEuroCents(50)} onClick={() => { setGiven((given) => given + 50) }} />
        </Col>
        <Col xs={4} className="d-flex justify-content-center align-items-center">
          <Image style={{margin: "auto"}} roundedCircle thumbnail src={eur1} alt={displayEuroCents(100)} onClick={() => { setGiven((given) => given + 100) }} />
        </Col>
        <Col xs={4} className="d-flex justify-content-center align-items-center">
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
      <Button style={{ marginBottom: 10 }} variant="secondary" size="lg" onClick={onBack}>Torna indietro</Button><br/>
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

export function PrintableOrder({ count, coperti, tavolo, given }: { count: string, coperti: string, tavolo: string, given: number }) {
  const products = useAppSelector(selectProducts);

  const totalEuroCents = Object.values(products).reduce((total, product) => total + product.euroCents * product.quantity, 0)
  const resto = given - totalEuroCents

  const totalClientLines = Object.values(products).reduce((total, product) => total + 1, 0)
  const totalKitchenLines = Object.values(products).reduce((total, product) => total + (product.quantity > 0 ? 1 : 0) + (product.notes !== "" ? 0.5 : 0), 0)

  const isClientFontBig = totalClientLines < 15
  const isKitchenFontBig = totalKitchenLines < 12

  return <>
  <Container fluid style={{ fontSize: "0.9rem", lineHeight: 1.5 }}>
    <div style={{position: 'relative'}}>
      <div style={{position: "absolute", width: "100%", textAlign: "center", paddingTop: 30}}>
        <h1 style={{ fontSize: 230 }}>{count}</h1>
        <h2 style={{ paddingTop: 0, margin: 0 }}>{tavolo ? `Tavolo ${tavolo} - ` : ""}{coperti}</h2>
      </div>
    </div>
    <Image style={{width: "100%"}} src={headerCliente} alt="Sagra di Canevara (MS)" />

    <Table bordered size="sm" style={{marginTop: 10}}>
      <tbody>
        { Object.entries(products).map(([key, product]) => {
          const totalPriceCents = product.euroCents * product.quantity
          
          return <tr key={key}>
            <td className="text-center" style={{verticalAlign: "middle", fontWeight: product.quantity > 0 ? "bold" : ""}}>
              &nbsp;
              {product.quantity}
              &nbsp;
            </td>
            <td style={{verticalAlign: "middle"}}>
              {product.name} ({displayEuroCents(product.euroCents)})
              {product.notes && product.quantity > 0 && <span> (Note: {product.notes})</span>}
            </td>
            <td className="text-end" style={{verticalAlign: "middle"}}><span style={{ fontSize: isClientFontBig ? "1rem" : "0.8rem" }}>{totalPriceCents > 0 ? displayEuroCents(totalPriceCents) : ""}</span></td>
          </tr>
        })}
      </tbody>
    </Table>

    <Row>
      <Col className="text-end">Totale: {displayEuroCents(totalEuroCents)}</Col>
    </Row>
    <Row>
      <Col className="text-end">Pagato: {displayEuroCents(given)}</Col>
    </Row>
    <Row>
      <Col className="text-end">Resto: {displayEuroCents(resto)}</Col>
    </Row>
    <Row>
      <Col>Documento non valido ai fini fiscali</Col>
    </Row>
  </Container>

  <Break/>

  <Container fluid style={{ fontSize: "1rem", lineHeight: 1.5 }}>
    <Row>
      <Col>
        PER LA CUCINA
      </Col>
      <Col className="text-end">Totale: {displayEuroCents(totalEuroCents)}</Col>
    </Row>

    <div style={{position: 'relative'}}>
      <div style={{position: "absolute", paddingRight: 230, width: "100%", textAlign: "center", paddingTop: 30}}>
        <h1 style={{ fontSize: 150 }}>{count}</h1>
        <h2 style={{ paddingTop: 0, margin: 0 }}>{tavolo ? `Tavolo ${tavolo} - ` : ""}{coperti}</h2>
      </div>
    </div>
    <Image style={{width: "100%"}} src={headerCucina} alt="Sagra di Canevara (MS)" />

    <Table bordered size="sm" style={{marginTop: 10}}>
      <tbody>
        { Object.entries(products).filter(item => item[1].quantity > 0).map(([key, product]) => {
          return <tr key={key} className={product.quantity === 0 ? "text-muted" : ""}>
            <td className="text-center" style={{verticalAlign: "middle"}}>
              <span style={{ fontSize: isKitchenFontBig ? "1.5rem" : "1.3rem", fontWeight: "bold" }}>{product.quantity}</span>
            </td>
            <td style={{verticalAlign: "middle"}}>
              {product.name}
              {product.notes && <span> (Note: <span style={{ fontWeight: "bold" }}>{product.notes}</span>)</span>}
            </td>
          </tr>
        })}
      </tbody>
    </Table>
  </Container>
  </>
}


function Break() {
  return <div style={{clear: "both", pageBreakAfter: "always"}}></div>
}

