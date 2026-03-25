import * as ROSLIB from 'roslib'

const URLS = [
  'ws://172.36.50.137:9090',
  'ws://172.36.50.98:9090'
]

function createRosConnection(urlIndex = 0) {
  const ros = new ROSLIB.Ros({
    url: URLS[urlIndex]
  })

  ros.on('connection', () => {
    console.log(`Connected to ROS at ${URLS[urlIndex]}`)
  })

  ros.on('error', (error) => {
    console.log(`ROS error on ${URLS[urlIndex]}:`, error)
    if (urlIndex + 1 < URLS.length) {
      console.log('Trying next URL...')
      createRosConnection(urlIndex + 1)
    } else {
      alert('Failed to connect to ROS on all URLs.')
    }
  })

  ros.on('close', () => {
    console.log('ROS connection closed')
  })

  return ros
}

const ros = createRosConnection()

export default ros