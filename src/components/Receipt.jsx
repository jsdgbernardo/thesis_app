import { useState, useEffect } from "react"
import * as ROSLIB from "roslib"
import ros from "../ros/rosConnection"

function Receipt() {
  const [items, setItems] = useState([])
  const [itemCount, setItemCount] = useState(0)
  const [totalPrice, setTotalPrice] = useState(0)

  const normalizeReceipt = (data) => {
    let itemArray = []

    if (Array.isArray(data)) {
      itemArray = data
    } else if (data && typeof data === "object") {
      if (Array.isArray(data.items)) {
        itemArray = data.items
      } else {
        // maybe object directly of key: {count, price}
        itemArray = Object.entries(data).map(([name, value]) => ({ name, ...value }))
      }
    } else {
      return []
    }

    return itemArray.map((item) => {
      const name = item.name || item.item || item.product || "Unknown"
      const qty = Number(item.count ?? item.qty ?? item.quantity ?? 1)
      const price = Number(item.price ?? item.unitPrice ?? item.unit_price ?? 0)
      const total = Number(item.total ?? qty * price)

      return {
        name,
        qty: Number.isFinite(qty) ? qty : 0,
        price: Number.isFinite(price) ? price : 0,
        total: Number.isFinite(total) ? total : 0,
      }
    })
  }

  useEffect(() => {
    const topic = new ROSLIB.Topic({
      ros: ros,
      name: "/app/receipt",
      messageType: "std_msgs/String",
    })

    topic.subscribe((msg) => {
      let parsed = []
      try {
        parsed = JSON.parse(msg.data)
      } catch (error) {
        // fallback to comma-separated values
        const parts = msg.data
          .split(",")
          .map((s) => s.trim().replace(/_/g, " "))
          .filter(Boolean)

        parsed = parts.map((p) => {
          const [name, count, price] = p.split(" ")
          const qty = Number(count || 1)
          const unitPrice = Number(price || 0)
          return { name, count: qty, price: unitPrice, total: qty * unitPrice }
        })
      }

      const normalized = normalizeReceipt(parsed)
      setItems(normalized)
      const totalQty = normalized.reduce((acc, item) => acc + item.qty, 0)
      const totalSum = normalized.reduce((acc, item) => acc + item.total, 0)
      setItemCount(totalQty)
      setTotalPrice(totalSum)
    })

    return () => topic.unsubscribe()
  }, [])

  return (
    <div
      style={{
        padding: "3vh",
        minWidth: "45vh",
        margin: "0 auto",
        background: "#f2f2f2",
        borderRadius: "10px",
        height: "25vh",
        overflowY: "auto",
      }}
    >
      <h2>Receipt</h2>
      <p>Items: {itemCount}</p>
      <p>Total: ₱{totalPrice.toFixed(2)}</p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.map((item, idx) => (
          <li
            key={`${item.name}-${idx}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: "1px solid #ddd",
            }}
          >
            <span>{item.name}</span>
            <span>qty: {item.qty}</span>
            <span>₱{item.price.toFixed(2)}</span>
            <strong>₱{item.total.toFixed(2)}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Receipt