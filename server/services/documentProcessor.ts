import { parse as parseHtml } from 'node-html-parser';

export class DocumentProcessor {
  async extractTextFromBuffer(buffer: Buffer, fileType: string): Promise<string> {
    try {
      switch (fileType.toLowerCase()) {
        case 'pdf':
        case 'application/pdf':
          return await this.extractFromPDF(buffer);
        
        case 'html':
        case 'text/html':
          return await this.extractFromHTML(buffer);
        
        default:
          // Try to parse as plain text
          return buffer.toString('utf-8');
      }
    } catch (error) {
      console.error('Document processing error:', error);
      throw new Error(`Failed to process ${fileType} document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async extractFromPDF(buffer: Buffer): Promise<string> {
    try {
      console.log('Processing PDF buffer of size:', buffer.length);
      
      // Dynamic import to avoid startup issues with pdf-parse
      const PDFParse = await import('pdf-parse-debugging-disabled');
      
      // Ensure we're passing the buffer correctly
      const pdfParser = PDFParse.default || PDFParse;
      
      if (typeof pdfParser !== 'function') {
        throw new Error('pdf-parse module not loaded correctly');
      }
      
      const data = await pdfParser(buffer);
      console.log('PDF parsing successful, extracted text length:', data.text.length);
      return data.text;
    } catch (error) {
      console.error('PDF parsing detailed error:', error);
      throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async extractFromHTML(buffer: Buffer): Promise<string> {
    try {
      const html = buffer.toString('utf-8');
      const root = parseHtml(html);
      
      // Remove script and style elements
      root.querySelectorAll('script, style').forEach(el => el.remove());
      
      // Extract text content
      const text = root.text;
      
      // Clean up whitespace
      return text.replace(/\s+/g, ' ').trim();
    } catch (error) {
      throw new Error(`HTML parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  validateFileType(filename: string, mimetype: string): boolean {
    const allowedTypes = [
      'application/pdf',
      'text/html',
      'text/plain'
    ];
    
    const allowedExtensions = ['.pdf', '.html', '.htm', '.txt'];
    
    const hasValidMimeType = allowedTypes.includes(mimetype);
    const hasValidExtension = allowedExtensions.some(ext => 
      filename.toLowerCase().endsWith(ext)
    );
    
    return hasValidMimeType || hasValidExtension;
  }

  getFileType(filename: string, mimetype: string): string {
    if (mimetype === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
      return 'pdf';
    }
    if (mimetype === 'text/html' || filename.toLowerCase().endsWith('.html') || filename.toLowerCase().endsWith('.htm')) {
      return 'html';
    }
    return 'text';
  }
}

export const documentProcessor = new DocumentProcessor();
