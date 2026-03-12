import * as ROSLIB from 'roslib'

const ros = new ROSLIB.Ros({
  url: 'ws://172.36.140.79:9090'
})

ros.on('connection', () => {
  console.log('Connected to ROS')
})

ros.on('error', (error) => {
  console.log('ROS error:', error)
})

ros.on('close', () => {
  console.log('ROS connection closed')
})

export default ros