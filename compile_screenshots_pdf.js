import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const rootDir = 'c:\\Users\\user\\3D Objects\\New folder\\fms-platform';
const outputPdfPath = path.join(rootDir, 'fms_app_screenshots.pdf');

// 1. Delete all old PDFs in the root directory first
const files = fs.readdirSync(rootDir);
files.forEach(file => {
  if (file.toLowerCase().endsWith('.pdf')) {
    const filePath = path.join(rootDir, file);
    try {
      fs.unlinkSync(filePath);
      console.log(`Removed old PDF: ${filePath}`);
    } catch (e) {
      console.error(`Error removing PDF ${filePath}:`, e);
    }
  }
});

const images = [
  { name: '1. Homepage Gate', path: 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6f4605c7-d656-4336-a735-c60a46378def\\home_1784124021912.png' },
  { name: '2. Projector Board (Excel Style)', path: 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6f4605c7-d656-4336-a735-c60a46378def\\projector_1784124034343.png' },
  { name: '3. Portfolios Overview', path: 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6f4605c7-d656-4336-a735-c60a46378def\\portfolio_1784124043741.png' },
  { name: '4. Results Standings', path: 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6f4605c7-d656-4336-a735-c60a46378def\\results_1784124053615.png' },
  { name: '5. Exchange Consolidated Trading Console', path: 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6f4605c7-d656-4336-a735-c60a46378def\\exchange_1784124086643.png' },
  { name: '6. SEBI Compliance Console', path: 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6f4605c7-d656-4336-a735-c60a46378def\\sebi_1784124096048.png' },
  { name: '7. Journalist News Dispatch Console', path: 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6f4605c7-d656-4336-a735-c60a46378def\\journalist_1784124110733.png' },
  { name: '8. Admin Console - War Room Panel', path: 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6f4605c7-d656-4336-a735-c60a46378def\\admin_war_room_1784124123902.png' },
  { name: '9. Admin Console - Securities Manager Panel', path: 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6f4605c7-d656-4336-a735-c60a46378def\\admin_securities_1784124134721.png' },
  { name: '10. Admin Console - Teams Control Panel', path: 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6f4605c7-d656-4336-a735-c60a46378def\\admin_teams_1784124147328.png' },
  { name: '11. Admin Console - Simulation Ledger', path: 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6f4605c7-d656-4336-a735-c60a46378def\\admin_ledger_1784124161630.png' },
  { name: '12. Admin Console - Platform Settings', path: 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6f4605c7-d656-4336-a735-c60a46378def\\admin_settings_1784124173387.png' },
  { name: '13. Admin Console - Corporate Actions Announcements', path: 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6f4605c7-d656-4336-a735-c60a46378def\\admin_corp_actions_1784124185287.png' },
  { name: '14. Training / Tutorial Page', path: 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\6f4605c7-d656-4336-a735-c60a46378def\\training_1784124196450.png' }
];

async function createPdf() {
  console.log('Starting PDF Compilation...');
  const doc = new PDFDocument({ autoFirstPage: false, margin: 30 });
  const writeStream = fs.createWriteStream(outputPdfPath);
  doc.pipe(writeStream);

  // Add cover page
  doc.addPage({ size: 'A4', layout: 'landscape' });
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0f172a');
  doc.fillColor('#ebd9b4')
     .font('Helvetica-Bold')
     .fontSize(36)
     .text('FMS - PLATFORM SCREENSHOTS REPORT', 50, 180, { align: 'center' });
  doc.fillColor('#ffffff')
     .fontSize(16)
     .text('SYSTEM VERIFICATION AND INTERFACE REPORT (EXCEL LAYOUT Restored)', 50, 245, { align: 'center' });
  doc.fillColor('#94a3b8')
     .fontSize(12)
     .text(`Generated Automatically on ${new Date().toLocaleDateString()}`, 50, doc.page.height - 80, { align: 'center' });

  // Add each screenshot
  for (const img of images) {
    if (!fs.existsSync(img.path)) {
      console.warn(`File missing: ${img.path}`);
      continue;
    }
    doc.addPage({ size: 'A4', layout: 'landscape' });
    
    // Header banner style
    doc.fillColor('#1e293b')
       .rect(0, 0, doc.page.width, 50)
       .fill();
    doc.fillColor('#ffffff')
       .font('Helvetica-Bold')
       .fontSize(14)
       .text(img.name, 24, 18);
    
    // Fit Image nicely on landscape A4 (841.89 x 595.27)
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
