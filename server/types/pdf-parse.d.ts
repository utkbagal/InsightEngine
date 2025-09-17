declare module 'pdf-parse-debugging-disabled' {
  interface PDFData {
    text: string;
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    version: string;
  }

  function PDFParse(buffer: Buffer): Promise<PDFData>;
  export = PDFParse;
}