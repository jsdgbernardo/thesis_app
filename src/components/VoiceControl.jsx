import { useState, useEffect } from "react"
import { Model, createRecognizer } from "vosk-browser"

function VoiceControl() {
  const [speechText, setSpeechText] = useState("Loading recognizer...")
  const [listening, setListening] = useState(false)
  const [recognizer, setRecognizer] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const initVosk = async () => {
      setSpeechText("Initializing Vosk...")

      // Load tiny grammar model (folder with model.json)
      const model = new Model("/tiny-model") 

      const rec = await createRecognizer({
        model,
        sampleRate: 16000,
        grammar: ["follow me", "stop", "go to milk section", "go to eggs", "thank you"]
      })

      setRecognizer(rec)
      setReady(true)
      setSpeechText("Recognizer ready! Press 🎤 to speak.")
    }

    initVosk()
  }, [])

  const startListening = async () => {
    if (!ready) {
      alert("Recognizer still loading!")
      return
    }

    setListening(true)
    setSpeechText("Listening...")

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const audioContext = new AudioContext()
    const source = audioContext.createMediaStreamSource(stream)
    const processor = audioContext.createScriptProcessor(4096, 1, 1)

    source.connect(processor)
    processor.connect(audioContext.destination)

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0)
      if (recognizer.acceptWaveform(inputData)) {
        const result = recognizer.result()
        if (result.text) setSpeechText(result.text)
      } else {
        const partial = recognizer.partialResult()
        if (partial && partial.partial) setSpeechText(partial.partial)
      }
    }

    setTimeout(() => {
      processor.disconnect()
      source.disconnect()
      audioContext.close()
      setListening(false)
      setSpeechText("Stopped listening. Press 🎤 to speak again.")
    }, 10000)
  }

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>Vosk Tiny Grammar Demo</h2>
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
        disabled={!ready || listening}
        style={{
          padding: "15px 30px",
          fontSize: "18px",
          borderRadius: "10px",
          border: "none",
          background: !ready ? "#aaa" : listening ? "#ff4d4d" : "#4CAF50",
          color: "white",
          cursor: !ready ? "not-allowed" : "pointer",
        }}
      >
        {!ready ? "Loading..." : listening ? "Listening..." : "🎤 Speak"}
      </button>
    </div>
  )
}

export default VoiceControl