import type {
  ActionType,
  CanvasElement,
  ElementAction,
} from "./types";
export function getElementActions(
  element: CanvasElement,
): ElementAction[] {
  if (element.actions?.length) {
    return element.actions;
  }

  if (
    element.buttonAction &&
    element.buttonAction !== "none"
  ) {
    return [
      {
        id: `legacy-${element.id}`,
        type: element.buttonAction as ActionType,
        value: element.actionValue ?? "",
        method: "GET",
        delayMs: 0,
      },
    ];
  }

  return [];
}

export function applyElementFeedback(
  element: CanvasElement,
  variables: Record<string, unknown>,
): CanvasElement {
  const feedback = element.feedback;

  if (!feedback?.enabled) return element;

  const key = `${feedback.pluginId}:${feedback.variableId}`;
  const rawValue = variables[key];
  const currentValue = String(rawValue ?? "");
  const expectedValue = feedback.expectedValue ?? "";

  const matches =
    feedback.operator === "equals"
      ? currentValue === expectedValue
      : feedback.operator === "notEquals"
        ? currentValue !== expectedValue
        : feedback.operator === "contains"
          ? currentValue.includes(expectedValue)
          : Boolean(rawValue);

  if (!matches) return element;

  return {
    ...element,
    background:
      feedback.activeBackground || element.background,
    color: feedback.activeColor || element.color,
    text: feedback.activeText || element.text,
    visible:
      feedback.visibility === "hide"
        ? false
        : feedback.visibility === "show"
          ? true
          : element.visible,
  };
}


