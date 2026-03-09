import { useState, useRef } from "react"

function VoiceControl() {
  const [speechText, setSpeechText] = useState("Press the mic and speak")
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in this browser")
      return
    }

    // If already listening, stop it
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop()
      return
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition

    recognition.lang = "en-US"
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onstart = () => {
      setListening(true)
      setSpeechText("Listening...")
    }

    recognition.onend = () => {
      setListening(false)
      recognitionRef.current = null
    }

    recognition.onresult = (event) => {
      let transcript = ""
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }

      setSpeechText(transcript)

      const last = event.results[event.results.length - 1]
      if (last.isFinal) {
        console.log("Final Speech:", transcript)
      }
    }

    recognition.start()
  }

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>Voice Test</h2>
      <div
        style={{
          background: "#f2f2f2",
          padding: "20px",
          borderRadius: "10px",
          minHeight: "60px",
          marginBottom: "20px",
          fontSize: "18px",
        }}
      >
        {speechText}
      </div>
      <button
        onClick={startListening}
        style={{
          padding: "15px 30px",
          fontSize: "18px",
          borderRadius: "10px",
          border: "none",
          background: listening ? "#ff4d4d" : "#4CAF50",
          color: "white",
          cursor: "pointer",
        }}
      >
        {listening ? "Stop Listening" : "🎤 Speak"}
      </button>
    </div>
  )
}

export default VoiceControl