import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import * as qr from 'qrcode';
import { auth } from '@auth';
import { getUserById, updateUser } from '@db/user';

const DPI = 72; // Standard PDF DPI
const PAGE_WIDTH = 8.5 * DPI; // 612 points
const PAGE_HEIGHT = 11 * DPI; // 792 points
const IMAGES_ACROSS = 7;
const IMAGES_DOWN = 9;

// Avery Label Templates (dimensions in inches, converted to points)
const AVERY_TEMPLATES = {
  '5160': { // Address labels
    across: 3,
    down: 10,
    width: 2.625,
    height: 1,
    marginLeft: 0.1875,
    marginTop: 0.5,
    spacingX: 0.125,
    spacingY: 0
  },
  '5163': { // Shipping labels 
    across: 2,
    down: 5,
    width: 4,
    height: 2,
    marginLeft: 0.25,
    marginTop: 0.5,
    spacingX: 0.25,
    spacingY: 0
  },
  '5164': { // Shipping labels
    across: 2,
    down: 3,
    width: 4,
    height: 3.33,
    marginLeft: 0.25,
    marginTop: 0.17,
    spacingX: 0.25,
    spacingY: 0
  },
  '5167': { // Return address labels
    across: 4,
    down: 20,
    width: 1.75,
    height: 0.5,
    marginLeft: 0.3125,
    marginTop: 0.5,
    spacingX: 0.1875,
    spacingY: 0
  },
  '5261': { // Address labels
    across: 2,
    down: 10,
    width: 4,
    height: 1,
    marginLeft: 0.25,
    marginTop: 0.5,
    spacingX: 0.25,
    spacingY: 0
  },
  '5262': { // Address labels
    across: 2,
    down: 7,
    width: 4,
    height: 1.33,
    marginLeft: 0.25,
    marginTop: 0.17,
    spacingX: 0.25,
    spacingY: 0.17
  },
  '8160': { // Address labels (same as 5160)
    across: 3,
    down: 10,
    width: 2.625,
    height: 1,
    marginLeft: 0.1875,
    marginTop: 0.5,
    spacingX: 0.125,
    spacingY: 0
  },
  '22816': { // Square labels
    across: 3,
    down: 6,
    width: 2.5,
    height: 2.5,
    marginLeft: 0.25,
    marginTop: 0.5,
    spacingX: 0.25,
    spacingY: 0.25
  }
};

// Calculate dimensions to fit the template grid
const TOTAL_MARGIN_X = 40; // Left + right margins
const TOTAL_MARGIN_Y = 80; // Top + bottom margins (accounting for header/footer)
const GRID_WIDTH = PAGE_WIDTH - TOTAL_MARGIN_X;
const GRID_HEIGHT = PAGE_HEIGHT - TOTAL_MARGIN_Y;
const BOX_WIDTH = GRID_WIDTH / IMAGES_ACROSS;
const BOX_HEIGHT = GRID_HEIGHT / IMAGES_DOWN;
const BOX_SIZE = Math.min(BOX_WIDTH, BOX_HEIGHT); // Use square boxes

// Center the grid on the page
const START_X = (PAGE_WIDTH - (BOX_SIZE * IMAGES_ACROSS)) / 2;
const START_Y = PAGE_HEIGHT - ((PAGE_HEIGHT - (BOX_SIZE * IMAGES_DOWN)) / 2) - BOX_SIZE;

async function generateQRCodeWithLogo(url: string, size: number): Promise<Uint8Array> {
  // Generate QR code sized to fit in the box with some padding
  const qrSize = Math.floor(size * 0.9); // 90% of box size for padding
  
  // Try different error correction levels if the URL is long
  const errorLevels = ['H', 'Q', 'M', 'L'] as const; // H=30%, Q=25%, M=15%, L=7%
  
  for (const level of errorLevels) {
    try {
      const pngBuffer = await qr.toBuffer(url, {
        errorCorrectionLevel: level,
        width: qrSize,
        margin: 0, // Minimize margin for more space
        type: 'png'
      });
      
      return new Uint8Array(pngBuffer);
    } catch (error) {
      // If this level fails, try the next one with less error correction
      if (level === 'L') {
        // If even L level fails, the URL is too long - truncate or use short URL
        throw new Error(`URL too long for QR code: ${url}`);
      }
      continue;
    }
  }
  
  throw new Error('Failed to generate QR code');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !session.user.email) {
    return NextResponse.json({ message: '401 Unauthorized' }, { status: 401 });
  }

  try {
    // Parse request body to get template and noProof (userEmail from session)
    const { template, noProof } = await request.json();
    const userEmail = session.user.email;

    // Get user and check quota
    const user = await getUserById(userEmail);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentQuota = user.quota?.qrSheet ?? 10;
    
    if (currentQuota <= 0) {
      return NextResponse.json({ error: 'Quota exceeded' }, { status: 429 });
    }

    // Parse template parameter (e.g., "4x6", "5160", "avery-5160")
    let imagesAcross = IMAGES_ACROSS;
    let imagesDown = IMAGES_DOWN;
    let boxWidth = BOX_WIDTH;
    let boxHeight = BOX_HEIGHT;
    let boxSize = BOX_SIZE;
    let startX = START_X;
    let startY = START_Y;
    let useAverySpacing = false;
    let averyTemplate = null;
    
    if (template && typeof template === 'string') {
      // Check for Avery template (e.g., "5160", "avery-5160")
      const averyMatch = template.match(/^(?:avery-)?(\d+)$/);
      if (averyMatch && averyMatch[1] in AVERY_TEMPLATES) {
        averyTemplate = AVERY_TEMPLATES[averyMatch[1] as keyof typeof AVERY_TEMPLATES];
        imagesAcross = averyTemplate.across;
        imagesDown = averyTemplate.down;
        boxWidth = averyTemplate.width * DPI;
        boxHeight = averyTemplate.height * DPI;
        boxSize = Math.min(boxWidth, boxHeight);
        
        // Use Avery's exact positioning
        startX = averyTemplate.marginLeft * DPI;
        startY = PAGE_HEIGHT - (averyTemplate.marginTop * DPI) - boxHeight;
        useAverySpacing = true;
      } else {
        // Check for simple grid format (e.g., "4x6")
        const gridMatch = template.match(/^(\d+)x(\d+)$/);
        if (gridMatch) {
          imagesAcross = parseInt(gridMatch[1], 10);
          imagesDown = parseInt(gridMatch[2], 10);
          
          // Calculate dimensions for the specified template
          const gridWidth = PAGE_WIDTH - TOTAL_MARGIN_X;
          const gridHeight = PAGE_HEIGHT - TOTAL_MARGIN_Y;
          boxWidth = gridWidth / imagesAcross;
          boxHeight = gridHeight / imagesDown;
          boxSize = Math.min(boxWidth, boxHeight);

          // Center the grid on the page
          startX = (PAGE_WIDTH - (boxSize * imagesAcross)) / 2;
          startY = PAGE_HEIGHT - ((PAGE_HEIGHT - (boxSize * imagesDown)) / 2) - boxSize;
        }
      }
    }

    // Generate the PDF
    const { id } = await params;
    const baseUrl = `https://run.defcon.run/qr/${id}`;
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    
    // Draw dotted fold lines between cells (skip for Avery templates)
    if (!useAverySpacing) {
      // Vertical fold lines (between columns)
      for (let i = 1; i < imagesAcross; i++) {
        const x = startX + i * boxSize;
        const lineStart = startY + boxSize;  // Start from top of grid (above first row)
        const lineEnd = startY - (imagesDown - 1) * boxSize;  // End at bottom of grid
        
        // Draw dotted line manually
        const dashLength = 3;
        const gapLength = 3;
        let currentY = lineStart;
        
        while (currentY > lineEnd) {
          const dashEnd = Math.max(currentY - dashLength, lineEnd);
          page.drawLine({
            start: { x, y: currentY },
            end: { x, y: dashEnd },
            thickness: 0.5,
            color: rgb(0.7, 0.7, 0.7)
          });
          currentY = dashEnd - gapLength;
        }
      }

      // Horizontal fold lines (between rows)
      for (let i = 1; i < imagesDown; i++) {
        const y = startY + boxSize - i * boxSize;  // Adjust to be between cells
        const lineStart = startX;
        const lineEnd = startX + imagesAcross * boxSize;
        
        // Draw dotted line manually
        const dashLength = 3;
        const gapLength = 3;
        let currentX = lineStart;
        
        while (currentX < lineEnd) {
          const dashEnd = Math.min(currentX + dashLength, lineEnd);
          page.drawLine({
            start: { x: currentX, y },
            end: { x: dashEnd, y },
            thickness: 0.5,
            color: rgb(0.7, 0.7, 0.7)
          });
          currentX = dashEnd + gapLength;
        }
      }
    }

    for (let dx = 0; dx < imagesAcross; dx++) {
      for (let dy = 0; dy < imagesDown; dy++) {
        const qrBuffer = await generateQRCodeWithLogo(baseUrl, boxSize);
        const pdfImage = await pdfDoc.embedPng(qrBuffer);
        
        // Calculate position for this QR code
        let x, y;
        
        if (useAverySpacing && averyTemplate) {
          // Use Avery template precise positioning with spacing
          x = startX + dx * (boxWidth + (averyTemplate.spacingX * DPI)) + (boxWidth - pdfImage.width) / 2;
          y = startY - dy * (boxHeight + (averyTemplate.spacingY * DPI)) + (boxHeight - pdfImage.height) / 2;
        } else {
          // Use regular grid positioning
          x = startX + dx * boxSize + (boxSize - pdfImage.width) / 2;
          y = startY - dy * boxSize + (boxSize - pdfImage.height) / 2;
        }

        page.drawImage(pdfImage, {
          x: x,
          y: y,
          width: pdfImage.width,
          height: pdfImage.height,
        });
      }
    }

    // Add header text with URL
    const headerY = PAGE_HEIGHT - 30; // 30 points from top
    const urlText = `${baseUrl}`;
    
    page.drawText(urlText, {
      x: 40, // Left margin
      y: headerY,
      size: 10,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Skip pages 2-4 if noProof is requested
    if (!noProof) {
      // Add second page with large QR code
      const page2 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      
      // Generate large QR code (70% of page width/height, whichever is smaller)
      const largeQRSize = Math.min(PAGE_WIDTH, PAGE_HEIGHT) * 0.7;
      const largeQRBuffer = await generateQRCodeWithLogo(baseUrl, largeQRSize);
      const largePdfImage = await pdfDoc.embedPng(largeQRBuffer);
      
      // Center the large QR code on the page
      const centerX = (PAGE_WIDTH - largePdfImage.width) / 2;
      const centerY = (PAGE_HEIGHT - largePdfImage.height) / 2;
      
      page2.drawImage(largePdfImage, {
        x: centerX,
        y: centerY,
        width: largePdfImage.width,
        height: largePdfImage.height,
      });

      // Add header text to page 2 as well
      page2.drawText(urlText, {
        x: 40,
        y: headerY,
        size: 10,
        color: rgb(0.3, 0.3, 0.3),
      });

      // Add third page with QR codes showing different template sizes
      const page3 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

      // Add header text to page 3
      page3.drawText(urlText, {
        x: 40,
        y: headerY,
        size: 10,
        color: rgb(0.3, 0.3, 0.3),
      });
      
      // Define specific grid configurations
      const gridConfigs = [
        { across: 2, down: 2 },
        { across: 2, down: 3 },
        { across: 2, down: 4 },
        { across: 3, down: 3 },
        { across: 3, down: 4 },
        { across: 3, down: 5 },
        { across: 4, down: 5 },
        { across: 4, down: 6 },
        { across: 4, down: 7 },
        { across: 5, down: 6 },
        { across: 5, down: 8 },
        { across: 6, down: 8 },
        { across: 7, down: 8 },
        { across: 8, down: 8 },
      ];
      
      // Store generated QR images to avoid regenerating
      const qrImages: Array<{ config: typeof gridConfigs[0], image: any }> = [];
      
      // Generate ONE QR code for each template configuration
      for (const config of gridConfigs) {
        // Calculate dimensions for this template
        const templateGridWidth = PAGE_WIDTH - TOTAL_MARGIN_X;
        const templateGridHeight = PAGE_HEIGHT - TOTAL_MARGIN_Y;
        const templateBoxWidth = templateGridWidth / config.across;
        const templateBoxHeight = templateGridHeight / config.down;
        const templateBoxSize = Math.min(templateBoxWidth, templateBoxHeight);
        
        // Generate QR code at the exact size it would be in that template
        const qrBuffer = await generateQRCodeWithLogo(baseUrl, templateBoxSize);
        const pdfImage = await pdfDoc.embedPng(qrBuffer);
        
        qrImages.push({ config, image: pdfImage });
      }
      
      // Now lay out all the QR codes on page 3 and 4 in a clean grid
      const pageMargin = 40;
      const spacingBetween = 15; // Space between QR codes
      const labelHeight = 12; // Space for label below QR
      let currentX = pageMargin;
      let currentY = PAGE_HEIGHT - pageMargin; // Start from top
      let maxHeightInRow = 0;
      let currentPage = page3;
      let qrIndex = 0;
      
      // Track which QRs go on page 4
      const page4QRs: Array<{ config: typeof gridConfigs[0], image: any }> = [];
      
      for (const { config, image } of qrImages) {
        // Check if we need to wrap to next row
        if (currentX + image.width > PAGE_WIDTH - pageMargin) {
          currentX = pageMargin;
          currentY = currentY - maxHeightInRow - labelHeight - spacingBetween;
          maxHeightInRow = 0;
        }
        
        // Check if we have space on the current page
        if (currentY - image.height - labelHeight < pageMargin) {
          if (currentPage === page3) {
            // Save remaining QRs for page 4
            page4QRs.push(...qrImages.slice(qrIndex));
            break;
          }
        }
        
        // Draw the QR code at its actual size
        currentPage.drawImage(image, {
          x: currentX,
          y: currentY - image.height,
          width: image.width,
          height: image.height,
        });
        
        // Add label below the QR code
        const labelText = `${config.across}x${config.down}`;
        const labelSize = 7;
        const labelWidth = labelText.length * labelSize * 0.4; // Approximate width
        
        currentPage.drawText(labelText, {
          x: currentX + (image.width / 2) - (labelWidth / 2),
          y: currentY - image.height - 10,
          size: labelSize,
          color: rgb(0.3, 0.3, 0.3),
        });
        
        // Update position for next QR code
        currentX += image.width + spacingBetween;
        maxHeightInRow = Math.max(maxHeightInRow, image.height);
        qrIndex++;
      }
      
      // If there are QRs that didn't fit on page 3, add page 4
      if (page4QRs.length > 0) {
        const page4 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

        // Add header text to page 4
        page4.drawText(urlText, {
          x: 40,
          y: headerY,
          size: 10,
          color: rgb(0.3, 0.3, 0.3),
        });
        
        // Reset positioning for page 4
        currentX = pageMargin;
        currentY = PAGE_HEIGHT - pageMargin;
        maxHeightInRow = 0;
        
        for (const { config, image } of page4QRs) {
          // Check if we need to wrap to next row
          if (currentX + image.width > PAGE_WIDTH - pageMargin) {
            currentX = pageMargin;
            currentY = currentY - maxHeightInRow - labelHeight - spacingBetween;
            maxHeightInRow = 0;
          }
          
          // Check if we have space on the page
          if (currentY - image.height - labelHeight < pageMargin) {
            break; // No more room even on page 4
          }
          
          // Draw the QR code at its actual size
          page4.drawImage(image, {
            x: currentX,
            y: currentY - image.height,
            width: image.width,
            height: image.height,
          });
          
          // Add label below the QR code
          const labelText = `${config.across}x${config.down}`;
          const labelSize = 7;
          const labelWidth = labelText.length * labelSize * 0.4; // Approximate width
          
          page4.drawText(labelText, {
            x: currentX + (image.width / 2) - (labelWidth / 2),
            y: currentY - image.height - 10,
            size: labelSize,
            color: rgb(0.3, 0.3, 0.3),
          });
          
          // Update position for next QR code
          currentX += image.width + spacingBetween;
          maxHeightInRow = Math.max(maxHeightInRow, image.height);
        }
      }
    }

    // Update user quota
    await updateUser({
      email: userEmail,
      quota: {
        ...user.quota,
        qrSheet: currentQuota - 1
      }
    });

    const pdfBytes = await pdfDoc.save();

    // Create filename with template info including dimensions
    let templateSuffix = '';
    if (template) {
      if (useAverySpacing && averyTemplate) {
        const dimensions = `${averyTemplate.width}x${averyTemplate.height}in`;
        templateSuffix = `-avery-${template.replace(/^avery-/, '')}-${dimensions}`;
      } else {
        const boxSizeInches = (boxSize / DPI).toFixed(1);
        templateSuffix = `-${imagesAcross}x${imagesDown}-${boxSizeInches}x${boxSizeInches}in`;
      }
    } else {
      // Default template dimensions
      const defaultBoxSizeInches = (BOX_SIZE / DPI).toFixed(1);
      templateSuffix = `-7x9-${defaultBoxSizeInches}x${defaultBoxSizeInches}in`;
    }
    const filename = `qr-${id}${templateSuffix}.pdf`;

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}

// Keep GET for backwards compatibility but return error
export async function GET() {
  const session = await auth();
  if (!session || !session.user.email) {
    return NextResponse.json({ message: '401 Unauthorized' }, { status: 401 });
  }
  
  return NextResponse.json(
    { error: 'Please use the frontend route /qr-sheet/[id] to generate QR sheets' },
    { status: 403 }
  );
}