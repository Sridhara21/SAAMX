import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Define the exact files saved by the subagent
const screenshotDir = 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6f4605c7-d656-4336-a735-c60a46378def';
const files = [
  'home_calibrated_1783243693166.png',
  'projector_calibrated_1783243729858.png',
  'exchange_calibrated_1783243763634.png',
  'sebi_calibrated_1783243787483.png',
  'portfolio_calibrated_1783243797182.png',
  'admin_calibrated_1783243805912.png',
  'results_calibrated_1783243827675.png',
  'journalist_calibrated_1783243841147.png'
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
