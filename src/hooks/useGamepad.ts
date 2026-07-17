import { useEffect, useRef, useCallback, useState } from "react";

export type ControllerType = "ps" | "xbox" | "generic" | "none";

export type GamepadAction =
  | "up" | "down" | "left" | "right"
  | "confirm" | "back" | "delete"
  | "lb" | "rb"
  | "start" | "select"
  | "toggle_hints";

type GamepadCallback = (action: GamepadAction) => void;

const DEADZONE = 0.5;
const REPEAT_DELAY = 300;
const REPEAT_RATE = 150;

function detectController(id: string): ControllerType {
  const lower = id.toLowerCase();
  if (lower.includes("dualsense") || lower.includes("dualshock") || lower.includes("wireless controller")) {
    return "ps";
  }
  if (lower.includes("xbox")) {
    return "xbox";
  }
  if (id.trim()) {
    return "generic";
  }
  return "none";
}

export function useGamepad(callback: GamepadCallback) {
  const [controllerType, setControllerType] = useState<ControllerType>("none");
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const lastInputRef = useRef<Record<string, number>>({});
  const lastRepeatedActionRef = useRef<GamepadAction | null>(null);

  const getAction = useCallback((gamepad: Gamepad): GamepadAction | null => {
    const b = gamepad.buttons;

    if (b[0]?.pressed) return "confirm";   // A / Cross
    if (b[1]?.pressed) return "back";      // B / Circle
    if (b[3]?.pressed) return "toggle_hints"; // Y / Triangle
    if (b[4]?.pressed) return "lb";
    if (b[5]?.pressed) return "rb";
    if (b[8]?.pressed) return "select";
    if (b[9]?.pressed) return "start";
    if (b[12]?.pressed) return "up";
    if (b[13]?.pressed) return "down";
    if (b[14]?.pressed) return "left";
    if (b[15]?.pressed) return "right";

    const x = gamepad.axes[0];
    const y = gamepad.axes[1];
    if (x !== undefined && x > DEADZONE) return "right";
    if (x !== undefined && x < -DEADZONE) return "left";
    if (y !== undefined && y > DEADZONE) return "down";
    if (y !== undefined && y < -DEADZONE) return "up";

    return null;
  }, []);

  useEffect(() => {
    let running = true;

    function poll() {
      if (!running) return;
      const gamepads = navigator.getGamepads?.();
      const gp = gamepads?.[0];
      if (!gp) {
        setControllerType("none");
        requestAnimationFrame(poll);
        return;
      }

      setControllerType((prev) => {
        if (prev === "none") return detectController(gp.id);
        return prev;
      });

      const action = getAction(gp);
      const now = Date.now();

      if (action) {
        const last = lastInputRef.current[action] || 0;
        const repeat = ["up", "down", "left", "right"].includes(action);
        const delay = repeat ? REPEAT_DELAY : 200;
        const rate = repeat ? REPEAT_RATE : 0;

        if (action === lastRepeatedActionRef.current && rate > 0) {
          if (now - last >= rate) {
            callbackRef.current(action);
            lastInputRef.current[action] = now;
          }
        } else if (now - last >= delay) {
          callbackRef.current(action);
          lastInputRef.current[action] = now;
          lastRepeatedActionRef.current = action;
        }
      } else {
        lastRepeatedActionRef.current = null;
      }

      requestAnimationFrame(poll);
    }

    const handleKey = (e: KeyboardEvent) => {
      const map: Record<string, GamepadAction> = {
        ArrowUp: "up", ArrowDown: "down",
        ArrowLeft: "left", ArrowRight: "right",
        Enter: "confirm", Escape: "back",
      };
      const action = map[e.key];
      if (action) {
        e.preventDefault();
        callbackRef.current(action);
      }
    };
    window.addEventListener("keydown", handleKey);
    requestAnimationFrame(poll);

    return () => {
      running = false;
      window.removeEventListener("keydown", handleKey);
    };
  }, [getAction]);

  return controllerType;
}
