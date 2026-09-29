import { describe, expect, it } from "vitest";

import { defaults } from "../catalog";
import {
  applyElementFeedback,
  getElementActions,
} from "../helpers";
import type {
  CanvasElement,
  ElementType,
} from "../types";

function createElement(
  type: ElementType,
  changes: Partial<CanvasElement> = {},
): CanvasElement {
  return {
    id: "element-1",
    type,
    ...defaults[type],
    ...changes,
  };
}

describe("editor helpers", () => {
  it("migrates a legacy button action", () => {
    const element = createElement("button", {
      buttonAction: "alert",
      actionValue: "Messaggio",
      actions: undefined,
    });

    const actions = getElementActions(element);

    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe("alert");
    expect(actions[0].value).toBe("Messaggio");
  });

  it("keeps explicit multiple actions", () => {
    const element = createElement("button", {
      actions: [
        {
          id: "one",
          type: "alert",
          value: "Uno",
        },
        {
          id: "two",
          type: "copy",
          value: "Due",
        },
      ],
    });

    expect(getElementActions(element)).toHaveLength(2);
  });

  it("applies a matching plugin feedback", () => {
    const element = createElement("button", {
      text: "REC",
      background: "#000000",
      feedback: {
        enabled: true,
        pluginId: "vmix",
        variableId: "recording",
        operator: "truthy",
        expectedValue: "",
        activeBackground: "#ff0000",
        activeColor: "#ffffff",
        activeText: "RECORDING",
        visibility: "show",
      },
    });

    const result = applyElementFeedback(element, {
      "vmix:recording": true,
    });

    expect(result.background).toBe("#ff0000");
    expect(result.text).toBe("RECORDING");
    expect(result.visible).toBe(true);
  });

  it("does not alter an unmatched feedback", () => {
    const element = createElement("button", {
      feedback: {
        enabled: true,
        pluginId: "obs",
        variableId: "streaming",
        operator: "equals",
        expectedValue: "true",
        activeBackground: "#00ff00",
        activeColor: "#ffffff",
        activeText: "LIVE",
        visibility: "unchanged",
      },
    });

    const result = applyElementFeedback(element, {
      "obs:streaming": false,
    });

    expect(result).toBe(element);
  });
});
