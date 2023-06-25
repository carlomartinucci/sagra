import {
  addDoc,
  updateDoc,
  collection,
  doc,
  serverTimestamp
} from '@firebase/firestore/lite';

const logOrder = async (firestore, order) => {
  const cachedQuantity = order.products.reduce((total, product) => total + product.quantity, 0)
  const cachedEuroCents = order.products.reduce((total, product) => total + product.euroCents * product.quantity, 0)

  const data = {
    count: order.count,
    cachedQuantity,
    cachedEuroCents,
    created: serverTimestamp(),
    products: order.products.map(product => ({
      euroCents: product.euroCents,
      name: product.name,
      quantity: product.quantity
    }))
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
