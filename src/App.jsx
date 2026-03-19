import { useState } from 'react'
import './App.css'
import VoiceControl from './components/VoiceControl'
import ShoppingList from './components/ShoppingList'
import Receipt from './components/Receipt'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <div className = 'phone-wrapper'>
      <h1>Semi-Autonomous Shopping Cart</h1>

      <ShoppingList />
      <Receipt />
      <VoiceControl />

    </div>
    </>
  )
}

export default App
