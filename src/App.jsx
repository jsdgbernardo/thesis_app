import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import './App.css'
import VoiceControl from './components/VoiceControl'
// import * as ROSLIB from 'roslib';

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <div className = 'phone-wrapper'>
      <h1>Semi-Autonomous Shopping Cart</h1>

      {/* <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p> */}

      <VoiceControl />

    </div>
    </>
  )
}

export default App
