// Minimale Typen für `linebreak` (Unicode-Zeilenumbruch nach UAX #14), das
// keine eigenen Typdefinitionen mitliefert. Genutzt in
// src/lib/pruefbericht-export/pdf-generator.ts — dieselbe Bibliothek, mit der
// pdfmake intern Text umbricht.
declare module "linebreak" {
  interface Break {
    position: number;
    required: boolean;
  }

  export default class LineBreaker {
    constructor(text: string);
    nextBreak(): Break | null;
  }
}
