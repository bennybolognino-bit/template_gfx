"use client";

import type { CanvasElement } from "../types";
export function CanvasItem({
  element,
  selected,
  onSelect,
}: {
  element: CanvasElement;
  selected: boolean;
  onSelect: (additive: boolean) => void;
}) {
  const commonClass = selected
    ? "outline outline-2 outline-offset-4 outline-blue-500"
    : "outline-none";

  const typographyStyle = {
    fontFamily:
      element.fontFamily ??
      "Arial, Helvetica, sans-serif",
    fontWeight: element.fontWeight ?? 400,
    fontStyle: element.fontStyle ?? "normal",
    textDecoration: element.textDecoration ?? "none",
    letterSpacing: element.letterSpacing ?? 0,
    lineHeight: element.lineHeight ?? 1.2,
  };

  if (element.type === "heading") {
    return (
      <h1
        onClick={(event) => onSelect(event.shiftKey || event.ctrlKey || event.metaKey)}
        className={`h-full w-full cursor-pointer font-bold ${commonClass}`}
        style={{ color: element.color, fontSize: element.fontSize, ...typographyStyle }}
      >
        {element.text}
      </h1>
    );
  }

  if (element.type === "text") {
    return (
      <p
        onClick={(event) => onSelect(event.shiftKey || event.ctrlKey || event.metaKey)}
        className={`h-full w-full cursor-pointer ${commonClass}`}
        style={{ color: element.color, fontSize: element.fontSize, ...typographyStyle }}
      >
        {element.text}
      </p>
    );
  }

  if (element.type === "button") {
    return (
      <button
        type="button"
        onClick={(event) => onSelect(event.shiftKey || event.ctrlKey || event.metaKey)}
        className={`h-full w-full cursor-pointer rounded-lg px-5 py-3 font-semibold shadow-sm ${commonClass}`}
        style={{
          color: element.color,
          background: element.backgroundImage ? "transparent" : element.background,
          fontSize: element.fontSize,
          ...typographyStyle,
        }}
      >
        {element.text}
      </button>
    );
  }

  if (element.type === "input") {
    return (
      <input
        readOnly
        onClick={(event) => onSelect(event.shiftKey || event.ctrlKey || event.metaKey)}
        placeholder={element.text}
        className={`h-full w-full cursor-pointer rounded-lg border border-slate-300 px-4 py-3 ${commonClass}`}
        style={{
          color: element.color,
          background: element.backgroundImage ? "transparent" : element.background,
          fontSize: element.fontSize,
          ...typographyStyle,
        }}
      />
    );
  }

  if (element.type === "shape") {
    if (element.shapeType === "line") {
      return (
        <div
          onClick={(event) =>
            onSelect(
              event.shiftKey ||
                event.ctrlKey ||
                event.metaKey,
            )
          }
          className={`flex h-full w-full cursor-pointer items-center ${commonClass}`}
        >
          <div
            className="w-full"
            style={{
              height: element.shapeThickness ?? 4,
              background: element.backgroundImage ? "transparent" : element.background,
            }}
          />
        </div>
      );
    }

    return (
      <div
        onClick={(event) =>
          onSelect(
            event.shiftKey ||
              event.ctrlKey ||
              event.metaKey,
          )
        }
        className={`h-full w-full cursor-pointer ${commonClass}`}
        style={{
          background: element.backgroundImage ? "transparent" : element.background,
          borderRadius:
            element.shapeType === "ellipse"
              ? "50%"
              : element.borderRadius ?? 0,
        }}
      />
    );
  }

  if (element.type === "image") {
    if (!element.imageSrc) {
      return (
        <div
          onClick={(event) =>
            onSelect(
              event.shiftKey ||
                event.ctrlKey ||
                event.metaKey,
            )
          }
          className={`flex h-full w-full cursor-pointer items-center justify-center border border-dashed border-slate-400 bg-slate-100 text-slate-500 ${commonClass}`}
          style={{
            borderRadius: element.borderRadius ?? 12,
          }}
        >
          Seleziona o carica un’immagine
        </div>
      );
    }

    return (
      <div
        role="img"
        aria-label={element.text}
        onClick={(event) =>
          onSelect(
            event.shiftKey ||
              event.ctrlKey ||
              event.metaKey,
          )
        }
        className={`h-full w-full cursor-pointer bg-center bg-no-repeat ${commonClass}`}
        style={{
          backgroundImage: `url(${element.imageSrc})`,
          backgroundSize:
            element.objectFit === "fill"
              ? "100% 100%"
              : element.objectFit ?? "cover",
          borderRadius: element.borderRadius ?? 12,
        }}
      />
    );
  }

  return (
    <div
      onClick={(event) => onSelect(event.shiftKey || event.ctrlKey || event.metaKey)}
      className={`h-full min-h-0 w-full cursor-pointer rounded-xl border border-dashed border-slate-400 p-6 ${commonClass}`}
      style={{
        color: element.color,
        background: element.backgroundImage ? "transparent" : element.background,
        fontSize: element.fontSize,
      }}
    >
      {element.text}
    </div>
  );
}


