import {
  addDoc,
  updateDoc,
  getDocs,
  collection,
  doc,
  serverTimestamp
} from '@firebase/firestore/lite';

function displayEuroCents(euroCents){
  return (euroCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, currency: "EUR", style: "currency" });
};

export const download = async (firestore) => {
  const headers = ["data", "ordineNumero", "quantità", "nome", "euro"]

  // add date filter?
  const snapshot = await getDocs(collection(firestore, `sagre/${process.env.REACT_APP_SAGRA_ID}/orderHistory`))

  let data = [headers]
  snapshot.forEach(doc => {
    const orderData = doc.data()
    orderData.products.forEach(product => {
      data.push([JSON.stringify(orderData.created.toDate()), orderData.count, product.quantity, product.name.replace(/[^a-z]/gi, ''), displayEuroCents(product.euroCents)])
    })
  })

  const orders = data
  console.log("orders", orders)

  // add some caching mechanism?
  // window.localStorage.setItem("orderHistory", JSON.stringify(orders))

  const csvContent = data.map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8,' })
  const objUrl = URL.createObjectURL(blob)
  window.open(objUrl);

  // const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
  // const encodedUri = encodeURI(csvContent);
  // window.open(encodedUri);
}

const logOrder = async (firestore, order) => {
  const cachedQuantity = order.products.reduce((total, product) => total + product.quantity, 0)
  const cachedEuroCents = order.products.reduce((total, product) => total + product.euroCents * product.quantity, 0)

  const data = {
    count: order.count,
    prefix: order.prefix,
    cachedQuantity,
    cachedEuroCents,
    created: serverTimestamp(),
    products: order.products.map(product => ({
      euroCents: product.euroCents,
      name: product.name,
      quantity: product.quantity
    })),
    mode: order.mode
  }

  if (order.id) {
    await updateDoc(doc(firestore, `sagre/${process.env.REACT_APP_SAGRA_ID}/orderHistory`, order.id), data)

    return order.id
  } else {
    const createdDoc = await addDoc(collection(firestore, `sagre/${process.env.REACT_APP_SAGRA_ID}/orderHistory`), data)

    return createdDoc.id
  }
}

export default logOrder
