import type { ActionType } from "./types";
export const actionOptions: Array<{
  type: ActionType;
  label: string;
}> = [
  { type: "alert", label: "Mostra messaggio" },
  { type: "confirm", label: "Richiedi conferma" },
  { type: "link", label: "Apri collegamento" },
  { type: "email", label: "Invia email" },
  { type: "phone", label: "Chiama numero" },
  { type: "copy", label: "Copia testo" },
  { type: "download", label: "Scarica file" },
  { type: "scroll", label: "Scorri verso elemento" },
  { type: "show", label: "Mostra elemento" },
  { type: "hide", label: "Nascondi elemento" },
  { type: "toggle", label: "Attiva/disattiva elemento" },
  { type: "setText", label: "Modifica testo elemento" },
  { type: "api", label: "Chiamata API" },
  { type: "submit", label: "Invia modulo" },
  { type: "play", label: "Riproduci media" },
  { type: "pause", label: "Pausa media" },
  { type: "openModal", label: "Apri finestra modale" },
  { type: "closeModal", label: "Chiudi finestra modale" },
  { type: "setStorage", label: "Salva variabile locale" },
  { type: "removeStorage", label: "Elimina variabile locale" },
  { type: "customEvent", label: "Invia evento personalizzato" },
  { type: "fullscreen", label: "Schermo intero" },
  { type: "back", label: "Pagina precedente" },
  { type: "reload", label: "Ricarica pagina" },
  { type: "print", label: "Stampa pagina" },
  { type: "plugin", label: "Comando plugin" },
];

export const targetActionTypes: ActionType[] = [
  "scroll",
  "show",
  "hide",
  "toggle",
  "setText",
  "submit",
  "play",
  "pause",
  "openModal",
  "closeModal",
  "fullscreen",
];


