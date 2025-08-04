import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import * as qr from 'qrcode';
import { auth } from '@auth';
import { getUserById, updateUser } from '@db/user';

const DPI = 170;
const IMG_WIDTH = 200;
const IMG_HEIGHT = 200;
const MARGIN_X = 0.20 * DPI;
const MARGIN_Y = 0.10 * DPI;
const PAGE_WIDTH = 8.5 * DPI;
const PAGE_HEIGHT = 11 * DPI;
const IMAGES_ACROSS = 7;
const IMAGES_DOWN = 9;

async function generateQRCodeWithLogo(url: string): Promise<Uint8Array> {
  // Generate QR code with logo space
  const qrCodeSvg = await qr.toString(url, {
    errorCorrectionLevel: 'H',
    width: 175,
    margin: 1,
    type: 'svg'
  });
  
  // Add white box with "33" text in the center
  const modifiedSvg = qrCodeSvg.replace(
    '</svg>',
    `<rect x="63.5" y="63.5" width="48" height="48" fill="black"/>
     <rect x="65.5" y="65.5" width="44" height="44" fill="white"/>
     <text x="87.5" y="95" font-family="Arial" font-size="20" text-anchor="middle" fill="black">33</text>
    </svg>`
  );
  
  // Convert SVG to PNG using qrcode's built-in conversion
  const pngBuffer = await qr.toBuffer(url, {
    errorCorrectionLevel: 'H',
    width: 175,
    margin: 1,
    type: 'png'
  });
  
  return new Uint8Array(pngBuffer);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Parse request body to get user email
    const { userEmail } = await request.json();
    
    if (!userEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user and check quota
    const user = await getUserById(userEmail);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentQuota = user.quota?.qrSheet ?? 10;
    
    if (currentQuota <= 0) {
      return NextResponse.json({ error: 'Quota exceeded' }, { status: 429 });
    }

    // Generate the PDF
    const { id } = await params;
    const baseUrl = `https://run.defcon.run/qr/${id}`;
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    
    for (let dx = 0; dx < IMAGES_ACROSS; dx++) {
      for (let dy = 0; dy < IMAGES_DOWN; dy++) {
        const qrBuffer = await generateQRCodeWithLogo(baseUrl);
        const pdfImage = await pdfDoc.embedPng(qrBuffer);
        const dim = pdfImage.scale(1);

        page.drawImage(pdfImage, {
          x: MARGIN_X + dx * IMG_WIDTH,
          y: PAGE_HEIGHT - MARGIN_Y - (dy + 1) * IMG_HEIGHT,
          width: dim.width,
          height: dim.height,
        });
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

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="qr-${id}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}

// Keep GET for backwards compatibility but return error
export async function GET() {
  return NextResponse.json(
    { error: 'Please use the frontend route /qr/sheet/[id] to generate QR sheets' },
    { status: 403 }
  );
}