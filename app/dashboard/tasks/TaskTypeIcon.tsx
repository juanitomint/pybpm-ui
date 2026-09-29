/** Icon for a BPMN task type, rendered from the pybpm-admin stencilset PNGs. */

import Box from "@mui/material/Box";

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
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: "50%",
        bgcolor: "background.paper",
        opacity: 0.85,
        flexShrink: 0,
      }}
    >
      <NextImage
        src={`/images/tasktype/${src}`}
        alt={tasktype ?? ""}
        width={size}
        height={size}
        style={{ flexShrink: 0 }}
        unoptimized
      />
    </Box>
  );
}
