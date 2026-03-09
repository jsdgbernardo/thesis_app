import React, { useEffect, useRef, useState } from 'react'
import ROSLIB from 'roslib'

export default function MapView({
  defaultRosbridge = 'ws://localhost:9090',
  defaultMapTopic = '/map',
  defaultPathTopic = '/plan',
  defaultPoseTopic = '/amcl_pose',
}) {
  const [rosbridgeUrl, setRosbridgeUrl] = useState(defaultRosbridge)
  const [mapTopic, setMapTopic] = useState(defaultMapTopic)
  const [pathTopic, setPathTopic] = useState(defaultPathTopic)
  const [poseTopic, setPoseTopic] = useState(defaultPoseTopic)

  const [connected, setConnected] = useState(false)
  const rosRef = useRef(null)
  const mapMsgRef = useRef(null)
  const pathMsgRef = useRef(null)
  const poseMsgRef = useRef(null)

  const canvasRef = useRef(null)
  const offscreenRef = useRef(null)

  // connect / disconnect
  useEffect(() => {
    const ros = new ROSLIB.Ros({ url: rosbridgeUrl })
    rosRef.current = ros
    ros.on('connection', () => setConnected(true))
    ros.on('close', () => setConnected(false))
    ros.on('error', () => setConnected(false))

    // subscribers
    const mapListener = new ROSLIB.Topic({ ros, name: mapTopic, messageType: 'nav_msgs/OccupancyGrid' })
    const pathListener = new ROSLIB.Topic({ ros, name: pathTopic, messageType: 'nav_msgs/Path' })
    const poseListener = new ROSLIB.Topic({ ros, name: poseTopic, messageType: 'geometry_msgs/PoseWithCovarianceStamped' })

    mapListener.subscribe((msg) => {
      mapMsgRef.current = msg
      // build offscreen image immediately
      buildMapImage(msg)
    })

    pathListener.subscribe((msg) => {
      pathMsgRef.current = msg
    })

    poseListener.subscribe((msg) => {
      poseMsgRef.current = msg
    })

    // render loop
    let rafId
    const loop = () => {
      draw()
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)

    return () => {
      mapListener.unsubscribe()
      pathListener.unsubscribe()
      poseListener.unsubscribe()
      if (rafId) cancelAnimationFrame(rafId)
      if (ros) ros.close()
    }
    // only connect on mount / rosbridgeUrl change
  }, [rosbridgeUrl, mapTopic, pathTopic, poseTopic])

  function buildMapImage(mapMsg) {
    if (!mapMsg) return
    const width = mapMsg.info.width
    const height = mapMsg.info.height
    const resolution = mapMsg.info.resolution
    const origin = mapMsg.info.origin
    const data = mapMsg.data // array of [-1..100]

    // create ImageData (one pixel per map cell)
    const image = new ImageData(width, height)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // flip vertically because OccupancyGrid typically starts at bottom-left
        const idx = x + (height - y - 1) * width
        const v = data[idx]
        let c
        if (v === -1) c = 205 // unknown gray
        else c = 255 - Math.round((v / 100) * 255) // 0 free -> white, 100 occupied -> black
        const i = (y * width + x) * 4
        image.data[i] = c
        image.data[i + 1] = c
        image.data[i + 2] = c
        image.data[i + 3] = 255
      }
    }

    // store offscreen canvas
    const off = document.createElement('canvas')
    off.width = width
    off.height = height
    const ctx = off.getContext('2d')
    ctx.putImageData(image, 0, 0)
    offscreenRef.current = { canvas: off, width, height, resolution, origin }
  }

  function worldToCanvas(x, y) {
    const off = offscreenRef.current
    const canvas = canvasRef.current
    if (!off || !canvas) return [0, 0]
    const { width: mapW, height: mapH, resolution, origin } = off
    const cx = (x - origin.position.x) / resolution
    const cy = (y - origin.position.y) / resolution
    // map coords to canvas pixels (flip y)
    const px = (cx / mapW) * canvas.width
    const py = ((mapH - cy) / mapH) * canvas.height
    return [px, py]
  }

  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    // clear
    ctx.fillStyle = '#222'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // draw map
    const off = offscreenRef.current
    if (off && off.canvas) {
      // stretch to fit canvas
      ctx.drawImage(off.canvas, 0, 0, canvas.width, canvas.height)
    } else {
      // no map yet
      ctx.fillStyle = '#333'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#fff'
      ctx.font = '14px sans-serif'
      ctx.fillText('Waiting for /map (nav_msgs/OccupancyGrid)...', 10, 20)
    }

    // draw path
    const path = pathMsgRef.current
    if (path && path.poses && path.poses.length > 0) {
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(40, 200, 40, 0.9)'
      ctx.beginPath()
      for (let i = 0; i < path.poses.length; i++) {
        const p = path.poses[i].pose.position
        const [px, py] = worldToCanvas(p.x, p.y)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.stroke()

      // small circles for path points
      ctx.fillStyle = 'rgba(40,200,40,0.9)'
      for (let i = 0; i < path.poses.length; i++) {
        const p = path.poses[i].pose.position
        const [px, py] = worldToCanvas(p.x, p.y)
        ctx.beginPath()
        ctx.arc(px, py, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // draw robot/cart marker
    const poseMsg = poseMsgRef.current
    if (poseMsg && poseMsg.pose && poseMsg.pose.pose) {
      const p = poseMsg.pose.pose.position
      const o = poseMsg.pose.pose.orientation
      const [px, py] = worldToCanvas(p.x, p.y)
      // get yaw
      const yaw = Math.atan2(2 * (o.w * o.z + o.x * o.y), 1 - 2 * (o.y * o.y + o.z * o.z))
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(-yaw) // rotate to match orientation
      // draw triangle representing cart
      ctx.fillStyle = '#ff4400'
      ctx.beginPath()
      ctx.moveTo(10, 0)
      ctx.lineTo(-8, -6)
      ctx.lineTo(-8, 6)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    // status text
    ctx.fillStyle = '#fff'
    ctx.font = '12px sans-serif'
    ctx.fillText('ROS bridge: ' + (connected ? 'connected' : 'disconnected'), 10, canvas.height - 10)
  }

  // resize canvas to container
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const parent = canvas.parentElement
      const rect = parent.getBoundingClientRect()
      canvas.width = Math.max(300, Math.floor(rect.width))
      canvas.height = Math.max(300, Math.floor(rect.height))
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  return (
    <div style={{ padding: 12, color: 'inherit' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <input value={rosbridgeUrl} onChange={(e) => setRosbridgeUrl(e.target.value)} style={{ flex: 1 }} />
        <button onClick={() => {
          // re-create connection by setting rosbridgeUrl (effect depends on it). A simple way is to toggle it.
          setRosbridgeUrl((s) => s)
        }}>{connected ? 'Reconnect' : 'Connect'}</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          Map topic
          <input value={mapTopic} onChange={(e) => setMapTopic(e.target.value)} />
        </label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          Path topic
          <input value={pathTopic} onChange={(e) => setPathTopic(e.target.value)} />
        </label>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          Pose topic
          <input value={poseTopic} onChange={(e) => setPoseTopic(e.target.value)} />
        </label>
      </div>

      <div style={{ width: '100%', height: 480, background: '#111', borderRadius: 6, overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>

    </div>
  )
}
