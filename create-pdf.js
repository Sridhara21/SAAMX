import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Define the exact files saved by the subagent
const screenshotDir = 'C:\\Users\\user\\3D Objects\\New folder\\fms-platform';
const files = [
  'screen_home.png',
  'screen_projector.png',
  'screen_exchange.png',
  'screen_sebi.png',
  'screen_portfolio.png',
  'screen_admin.png',
  'screen_results.png',
  'screen_journalist.png'
];

const outputFile = 'C:\\Users\\user\\3D Objects\\New folder\\fms-platform\\fms_platform_screenshots.pdf';

const createPDF = () => {
  const doc = new PDFDocument({ autoFirstPage: false });
  const stream = fs.createWriteStream(outputFile);
  doc.pipe(stream);

  files.forEach((file, index) => {
    const filePath = path.join(screenshotDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`Adding ${file} to PDF...`);
      // Standard page layout: letter/A4 landscape fits dashboard screenshots best
      doc.addPage({
        size: 'letter',
        layout: 'landscape'
      });
      // Draw image to fit page margins
      doc.image(filePath, 20, 20, {
        fit: [doc.page.width - 40, doc.page.height - 40],
        align: 'center',
        valign: 'center'
      });
    } else {
      console.warn(`File not found: ${filePath}`);
    }
  });

  doc.end();
  
  stream.on('finish', () => {
    console.log(`Successfully compiled PDF to: ${outputFile}`);
  });
};

createPDF();
