// src/components/ShoppingList.jsx
import { useState, useEffect } from "react"
import * as ROSLIB from "roslib"
import ros from "../ros/rosConnection"

function ShoppingList() {
  const [items, setItems] = useState([])

  useEffect(() => {
    const topic = new ROSLIB.Topic({
      ros: ros,
      name: "/shopping_list",        
      messageType: "std_msgs/String"
    })

    topic.subscribe((msg) => {
      const parts = msg.data
        .split(",")                   // split by comma
        .map((s) => s.trim().replace(/_/g, " ")) // replace _ with space
        .filter(Boolean)              // remove empty strings

      // Add processed items to the list
      setItems(parts)
    })

    return () => topic.unsubscribe()
  }, [])

  return (
    <div
        style={{
            padding: "3vh",
            minWidth: "45vh",
            margin: "0 auto",
            background: "#f2f2f2",    // big container background
            borderRadius: "10px",
            minHeight: "30vh",        // optional: set a minimum height
            maxHeight: "25vh",        // max height before scrolling
            overflowY: "auto",         // enable vertical scroll
        }}
        >
        <h2>Shopping List</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {items.map((item, idx) => (
            <li
                key={idx}
                style={{
                padding: "10px 15px",
                borderBottom: "1px solid #ddd", // optional separator
                }}
            >
                {item}
            </li>
            ))}
        </ul>
    </div>
  )
}

export default ShoppingList