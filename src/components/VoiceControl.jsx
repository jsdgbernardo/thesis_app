import { useState, useRef, useEffect } from "react"
import { publishVoiceCommand } from "../ros/publishVoice"
import * as ROSLIB from "roslib"
import ros from "../ros/rosConnection"

function VoiceControl() {

  const [speechText, setSpeechText] = useState("Press the mic and speak")
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    const topic = new ROSLIB.Topic({
      ros: ros,
      name: "/item_error",
      messageType: "std_msgs/String"
    })

    const callback = (msg) => {
      setSpeechText('Item unavailable: ' + msg.data)
    }

    topic.subscribe(callback)

    return () => {
      topic.unsubscribe(callback)
    }
  }, [])

  const startListening = () => {

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert("Speech Recognition not supported in this browser")
      return
    }

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
      setSpeechText(prev => (prev === "Listening..." ? "Press the mic and speak" : prev))
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

        // send to ROS
        publishVoiceCommand(transcript)
      }
    }

    recognition.start()
  }

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>

      <div
        style={{
          background: "#f2f2f2",
          padding: "20px",
          borderRadius: "10px",
          minHeight: "60px",
          marginBottom: "20px",
          fontSize: "18px"
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
          cursor: "pointer"
        }}
      >
        {listening ? "Stop Listening" : "🎤 Speak"}
      </button>

    </div>
  )
}

export default VoiceControl