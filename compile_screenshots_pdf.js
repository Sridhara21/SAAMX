import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const outputPdfPath = 'c:\\Users\\user\\3D Objects\\New folder\\fms-platform\\fms_app_screenshots.pdf';

const images = [
  { name: '1. Homepage Screen', path: 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6f4605c7-d656-4336-a735-c60a46378def\\homepage_1783953133631.png' },
  { name: '2. Projector Board (10x10 Matrix)', path: 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6f4605c7-d656-4336-a735-c60a46378def\\projector_1783953144641.png' },
  { name: '3. Results Leaderboard', path: 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6f4605c7-d656-4336-a735-c60a46378def\\results_1783953154088.png' },
  { name: '4. Admin - Surveillance Desk', path: 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6f4605c7-d656-4336-a735-c60a46378def\\admin_surveillance_1783953185325.png' },
  { name: '5. Admin - Securities CRUD Desk', path: 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6f4605c7-d656-4336-a735-c60a46378def\\admin_securities_1783953199601.png' },
  { name: '6. Admin - Participant Teams CRUD', path: 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6f4605c7-d656-4336-a735-c60a46378def\\admin_teams_1783953212556.png' },
  { name: '7. Admin - Platform Configuration Settings', path: 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6f4605c7-d656-4336-a735-c60a46378def\\admin_settings_1783953226578.png' },
  { name: '8. Admin - Corporate Actions Announcement Desk', path: 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6f4605c7-d656-4336-a735-c60a46378def\\admin_corporate_1783953239428.png' }
];

async function createPdf() {
  console.log('Starting PDF Compilation...');
  const doc = new PDFDocument({ autoFirstPage: false, margin: 30 });
  const writeStream = fs.createWriteStream(outputPdfPath);
  doc.pipe(writeStream);

  // Add cover page
  doc.addPage({ size: 'A4', layout: 'landscape' });
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#1a1a1a');
  doc.fillColor('#d4af37')
     .font('Helvetica-Bold')
     .fontSize(36)
     .text('FMS - PLATFORM SCREENSHOTS', 50, 180, { align: 'center' });
  doc.fillColor('#ffffff')
     .fontSize(16)
     .text('SYSTEM VERIFICATION AND INTERFACE REPORT', 50, 240, { align: 'center' });
  doc.fillColor('#888888')
     .fontSize(12)
     .text('Generated Automatically by Antigravity IDE', 50, doc.page.height - 80, { align: 'center' });

  // Add each screenshot
  for (const img of images) {
    if (!fs.existsSync(img.path)) {
      console.warn(`File missing: ${img.path}`);
      continue;
    }
    doc.addPage({ size: 'A4', layout: 'landscape' });
    
    // Header
    doc.fillColor('#1a1a1a')
       .rect(0, 0, doc.page.width, 50)
       .fill();
    doc.fillColor('#ffffff')
       .font('Helvetica-Bold')
       .fontSize(14)
       .text(img.name, 24, 18);
    
    // Fit Image nicely on landscape A4 (841.89 x 595.27)
    // Subtract margins and headers
    const fitWidth = doc.page.width - 48;
    const fitHeight = doc.page.height - 90;
    doc.image(img.path, 24, 65, {
      fit: [fitWidth, fitHeight],
      align: 'center',
      valign: 'center'
    });
  }

  doc.end();
  writeStream.on('finish', () => {
    console.log('PDF Compiled Successfully at: ' + outputPdfPath);
  });
}

createPdf().catch(console.error);
