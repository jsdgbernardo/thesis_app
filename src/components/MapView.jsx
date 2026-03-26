import { useEffect, useState } from "react";
import { Stage, Layer, Line, Circle, Image as KonvaImage } from "react-konva";
import ros from "../ros/rosConnection";

export default function MapView() {
  const [mapImage, setMapImage] = useState(null);
  const [mapInfo, setMapInfo] = useState(null);
  const [path, setPath] = useState([]);
  const [cart, setCart] = useState({ x: 0, y: 0, yaw: 0 });

  const cellScale = 2; // 2 pixels per map cell, adjust as needed

  // -----------------------------
  // MAP
  // -----------------------------
  useEffect(() => {
    const mapTopic = new window.ROSLIB.Topic({
      ros,
      name: "/map",
      messageType: "nav_msgs/OccupancyGrid",
    });

    mapTopic.subscribe((msg) => {
      const payload = msg.msg || msg;

      if (!payload.info || !payload.data || payload.data.length === 0) return;

      const { width, height, resolution, origin } = payload.info;
      setMapInfo({ width, height, resolution, origin });

      // Draw map as image
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      const imageData = ctx.createImageData(width, height);

      for (let i = 0; i < payload.data.length; i++) {
        const val = payload.data[i];
        const color = val === -1 ? 205 : 255 - val * 2;
        imageData.data[i * 4 + 0] = color;
        imageData.data[i * 4 + 1] = color;
        imageData.data[i * 4 + 2] = color;
        imageData.data[i * 4 + 3] = 255;
      }

      ctx.putImageData(imageData, 0, 0);

      const img = new window.Image();
      img.src = canvas.toDataURL();
      img.onload = () => setMapImage(img);
    });

    return () => mapTopic.unsubscribe();
  }, [ros]);

  // -----------------------------
  // PATH
  // -----------------------------
  useEffect(() => {
    if (!mapInfo) return;

    const pathTopic = new window.ROSLIB.Topic({
      ros,
      name: "/best_path",
      messageType: "nav_msgs/Path",
    });

    pathTopic.subscribe((msg) => {
      const payload = msg.msg || msg;
      if (!payload.poses || payload.poses.length === 0) return;

      const points = payload.poses.flatMap((p) => {
        if (!p.pose || !p.pose.position) return [0, 0];

        const x =
          (p.pose.position.x - mapInfo.origin.position.x) / mapInfo.resolution * cellScale;
        const y =
          (mapInfo.height - (p.pose.position.y - mapInfo.origin.position.y) / mapInfo.resolution) *
          cellScale;
        return [x, y];
      });

      setPath(points);
    });

    return () => pathTopic.unsubscribe();
  }, [ros, mapInfo]);

  // -----------------------------
  // CART
  // -----------------------------
  useEffect(() => {
    if (!mapInfo) return;

    const poseTopic = new window.ROSLIB.Topic({
      ros,
      name: "/amcl_pose",
      messageType: "geometry_msgs/PoseWithCovarianceStamped",
    });

    poseTopic.subscribe((msg) => {
      const payload = msg.msg || msg;
      if (!payload.pose || !payload.pose.pose) return;

      const pos = payload.pose.pose.position;
      const q = payload.pose.pose.orientation;

      const x =
        (pos.x - mapInfo.origin.position.x) / mapInfo.resolution * cellScale;
      const y =
        (mapInfo.height - (pos.y - mapInfo.origin.position.y) / mapInfo.resolution) *
        cellScale;

      const yaw =
        Math.atan2(
          2 * (q.w * q.z + q.x * q.y),
          1 - 2 * (q.y * q.y + q.z * q.z)
        );

      setCart({ x, y, yaw });
    });

    return () => poseTopic.unsubscribe();
  }, [ros, mapInfo]);

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <div 
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column"
      }}
    >
      <h2>Map View and Robot Path</h2>
      <Stage
        width={mapInfo ? mapInfo.width * cellScale : 400}
        height={mapInfo ? mapInfo.height * cellScale : 400}
      >
        <Layer>
          {mapImage && (
            <KonvaImage
              image={mapImage}
              width={mapInfo.width * cellScale}
              height={mapInfo.height * cellScale}
              scaleY={-1}
              y={mapInfo.height * cellScale}
            />
          )}

          {path.length > 0 && (
            <Line
              points={path}
              stroke="green"
              strokeWidth={2}
              lineCap="round"
              lineJoin="round"
            />
          )}

          <Circle
            x={cart.x}
            y={cart.y}
            radius={5}
            fill="blue"
          />
        </Layer>
      </Stage>
    </div>
  );
}
