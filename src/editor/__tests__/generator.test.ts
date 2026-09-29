import { describe, expect, it } from "vitest";

import { defaults } from "../catalog";
import { generateCode } from "../generator";
import type { CanvasElement } from "../types";

function createButton(): CanvasElement {
  return {
    id: "button-1",
    type: "button",
    ...defaults.button,
    text: "Avvia",
    actions: [
      {
        id: "action-1",
        type: "plugin",
        pluginId: "vmix",
        connectionId: "connection-1",
        pluginActionId: "start-recording",
        pluginOptions: {},
      },
    ],
    feedback: {
      enabled: true,
      pluginId: "vmix",
      variableId: "recording",
      operator: "truthy",
      expectedValue: "",
      activeBackground: "#ff0000",
      activeColor: "#ffffff",
      activeText: "REC",
      visibility: "unchanged",
    },
  };
}

describe("React generator", () => {
  it("generates a client component", () => {
    const code = generateCode([]);

    expect(code).toContain('"use client"');
    expect(code).toContain(
      "export default function GeneratedPage",
    );
  });

  it("includes actions, connection and element id", () => {
    const code = generateCode([createButton()]);

    expect(code).toContain('id="element-button-1"');
    expect(code).toContain("start-recording");
    expect(code).toContain("connection-1");
    expect(code).toContain("runActions");
  });

  it("includes feedback configuration", () => {
    const code = generateCode([createButton()]);

    expect(code).toContain("GENERATED_FEEDBACKS");
    expect(code).toContain("recording");
    expect(code).toContain("#ff0000");
  });

  it("uses gateway environment variables", () => {
    const code = generateCode([createButton()]);

    expect(code).toContain(
      "NEXT_PUBLIC_PLUGIN_GATEWAY_URL",
    );
    expect(code).toContain(
      "NEXT_PUBLIC_PLUGIN_GATEWAY_TOKEN",
    );
  });
});
