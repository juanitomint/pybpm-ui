/** Icon for a BPMN gate type, rendered from SVG icons. */

import NextImage from "next/image";

const GATE_ICON_MAP: Record<string, string> = {
  ParallelGateway: "parallel.svg",
  Exclusive_Databased_Gateway: "exclusive.svg",
  EventbasedGateway: "eventbased.svg",
  InclusiveGateway: "inclusive.svg",
};

export default function GateTypeIcon({
  gateType,
  size = 20,
}: {
  gateType: string | null;
  size?: number;
}) {
  const src = gateType ? GATE_ICON_MAP[gateType] : null;

  if (!src) return null;

  return (
    <NextImage
      src={`/images/gate/${src}`}
      alt={gateType ?? ""}
      width={size}
      height={size}
      style={{ flexShrink: 0 }}
      unoptimized
    />
  );
}
