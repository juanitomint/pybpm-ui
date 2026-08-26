/** Icon for a BPMN task type, rendered from the pybpm-admin stencilset PNGs. */

import Image from "next/image";

const ICON_MAP: Record<string, string> = {
  User: "type.user.png",
  Manual: "type.manual.png",
  Script: "type.script.png",
  Send: "type.send.png",
  Receive: "type.receive.png",
  "Business Rule": "type.business.rule.png",
  Service: "type.service.png",
};

export default function TaskTypeIcon({
  tasktype,
  size = 20,
}: {
  tasktype: string | null;
  size?: number;
}) {
  const src = tasktype ? ICON_MAP[tasktype] : null;

  if (!src) return null;

  return (
    <Image
      src={`/images/tasktype/${src}`}
      alt={tasktype ?? ""}
      width={size}
      height={size}
      style={{ flexShrink: 0 }}
      unoptimized
    />
  );
}
