import * as ROSLIB from "roslib"
import ros from "./rosConnection"

const voiceTopic = new ROSLIB.Topic({
  ros: ros,
  name: "/add_items",
  messageType: "std_msgs/String"
})

export function publishVoiceCommand(text) {

  voiceTopic.publish({
    data: text
  })

  console.log("Published to ROS:", text)
}