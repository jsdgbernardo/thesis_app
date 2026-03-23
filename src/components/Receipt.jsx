import { useState, useEffect } from "react"
import * as ROSLIB from "roslib"
import ros from "../ros/rosConnection"

function Receipt() {
  const [items, setItems] = useState([])
  const [totalPrice, setTotalPrice] = useState(0)

  const normalizeReceipt = (data) => {
    let itemArray = []

    if (Array.isArray(data)) {
      itemArray = data
    } else if (data && typeof data === "object") {
      if (Array.isArray(data.items)) {
        itemArray = data.items
      } else {
        itemArray = Object.entries(data).map(([name, value]) => ({ name, ...value }))
      }
    } else {
      return []
    }

    return itemArray.map((item) => {
      const name = item.name || item.item_name || item.product || "Unknown"
      const qty = Number(item.count ?? item.qty ?? item.quantity ?? 1)
      const price = Number(item.price ?? item.unitPrice ?? item.unit_price ?? 0)
      const subtotal = Number(item.subtotal ?? item.total ?? qty * price)

      return {
        name,
        qty: Number.isFinite(qty) ? qty : 0,
        price: Number.isFinite(price) ? price : 0,
        subtotal: Number.isFinite(subtotal) ? subtotal : 0,
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
      console.log("[ROS2 /app/receipt] incoming:", msg)
      let parsed = []
      try {
        parsed = JSON.parse(msg.data)
      } catch {
        const parts = msg.data
          .split(",")
          .map((s) => s.trim().replace(/_/g, " "))
          .filter(Boolean)

        parsed = parts.map((p) => {
          const [name, count, price] = p.split(" ")
          const qty = Number(count || 1)
          const unitPrice = Number(price || 0)
          return { name, count: qty, price: unitPrice, subtotal: qty * unitPrice }
        })
      }

      const normalized = normalizeReceipt(parsed)
      setItems(normalized)
      setTotalPrice(normalized.reduce((acc, item) => acc + item.subtotal, 0))
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

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.map((item, idx) => (
          <li
            key={`${item.name}-${idx}`}
            style={{
              display: "flex",
              alignItems: "baseline",
              padding: "4px 0",
              gap: "6px",
            }}
          >
            {/* (count) item */}
            <span style={{ whiteSpace: "nowrap" }}>
              ({item.qty}) {item.name}
            </span>

            {/* dotted fill */}
            <span
              style={{
                flex: 1,
                borderBottom: "1px dotted #999",
                marginBottom: "3px",
              }}
            />

            {/* price */}
            <span style={{ whiteSpace: "nowrap" }}>
              ₱{item.subtotal.toFixed(2)}
            </span>
          </li>
        ))}
      </ul>

      {items.length > 0 && (
        <div
          style={{
            marginTop: "10px",
            paddingTop: "8px",
            borderTop: "2px solid #333",
            display: "flex",
            justifyContent: "space-between",
            fontWeight: "bold",
          }}
        >
          <span>TOTAL</span>
          <span>₱{totalPrice.toFixed(2)}</span>
        </div>
      )}
    </div>
  )
}

export default Receipt