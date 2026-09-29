/** Icon for a BPMN token type, rendered from PNG images in public/images/icons/. */

import Image from "next/image";
import Box from "@mui/material/Box";

function getTokenIcon(type: string | null): string | null {
  if (!type) return null;

  const map: Record<string, string> = {
    // tasktype values (primary lookup)
    User: "type.user.png",
    Manual: "type.manual.png",
    Script: "type.script.png",
    Send: "type.send.png",
    Receive: "type.receive.png",
    "Business Rule": "type.business.rule.png",
    Service: "type.service.png",
    // type field fallbacks
    UserTask: "type.user.png",
    ManualTask: "type.manual.png",
    ScriptTask: "type.script.png",
    SendTask: "type.send.png",
    ReceiveTask: "type.receive.png",
    BusinessRuleTask: "type.business.rule.png",
    ServiceTask: "type.service.png",
    CallActivity: "type.call.png",
    SubProcess: "type.subprocess.png",
    CollapsedSubprocess: "type.subprocess.png",
    EventSubprocess: "type.subprocess.png",
    CollapsedEventSubprocess: "type.subprocess.png",
    ParallelGateway: "parallel.png",
    Exclusive_Databased_Gateway: "exclusive.png",
    EventbasedGateway: "eventbased.png",
    InclusiveGateway: "inclusive.png",
    ComplexGateway: "exclusive.png",
    StartNoneEvent: "start-none.png",
    StartMessageEvent: "start-message.png",
    StartTimerEvent: "start-timer.png",
    StartErrorEvent: "start-error.png",
    StartSignalEvent: "start-signal.png",
    StartEscalationEvent: "start-error.png",
    StartConditionalEvent: "start-none.png",
    StartCompensationEvent: "start-error.png",
    StartMultipleEvent: "start-none.png",
    StartParallelMultipleEvent: "start-none.png",
    IntermediateTimerEvent: "intermediate-timer.png",
    IntermediateMessageEvent: "intermediate-message.png",
    IntermediateErrorEvent: "intermediate-error.png",
    IntermediateSignalEvent: "intermediate-signal.png",
    IntermediateEscalationEvent: "intermediate-error.png",
    IntermediateConditionalEvent: "intermediate-catch.png",
    IntermediateLinkEventCatching: "intermediate-catch.png",
    IntermediateCancelEvent: "intermediate-throw.png",
    IntermediateCompensationEventCatching: "intermediate-catch.png",
    IntermediateMessageEventCatching: "intermediate-message.png",
    IntermediateMultipleEventCatching: "intermediate-catch.png",
    IntermediateParallelMultipleEventCatching: "intermediate-catch.png",
    EndNoneEvent: "end-none.png",
    EndMessageEvent: "end-message.png",
    EndErrorEvent: "end-error.png",
    EndSignalEvent: "end-signal.png",
    EndTerminateEvent: "end-terminate.png",
    EndEscalationEvent: "end-error.png",
    EndCompensationEvent: "end-terminate.png",
    EndMultipleEvent: "end-terminate.png",
  };

  return map[type] ?? null;
}

export default function TokenTypeIcon({
  type,
  tasktype,
  size = 20,
}: {
  type: string | null;
  tasktype?: string | null;
  size?: number;
}) {
  const lookupKey = tasktype ?? type;
  if (!lookupKey) return null;
  const icon = getTokenIcon(lookupKey);
  if (!icon) return null;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        bgcolor: "grey.100",
        borderRadius: 1,
      }}
    >
      <Image
        src={`/images/icons/${icon}`}
        alt={type ?? ""}
        width={size - 2}
        height={size - 2}
        style={{ flexShrink: 0 }}
        unoptimized
      />
    </Box>
  );
}
