import { auth } from '@auth';
import { getUser, getUserByHash } from '@db/user';
import { createAccomplishment, getAccomplishmentsByType } from '@db/accomplishment';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const session = await auth();
  
  if (!session || !session.user.email) {
    return NextResponse.json({ message: '401 Unauthorized' }, { status: 401 });
  }

  // Check for 'h' query parameter (user hash)
  const { searchParams } = new URL(req.url);
  const userHash = searchParams.get('h');
  
  if (!userHash) {
    return NextResponse.json({ message: 'Missing hash parameter' }, { status: 400 });
  }
  
  try {
    // Get the scanning user
    const scanningUser = await getUser(session.user.email);
    if (!scanningUser) {
      return NextResponse.json({ message: 'Scanner user not found' }, { status: 404 });
    }
    
    // Lookup QR code owner by hash
    const qrOwner = await getUserByHash(userHash);
    if (!qrOwner) {
      return NextResponse.json({ message: 'Invalid user hash' }, { status: 404 });
    }
    
    // Prevent self-scanning
    if (scanningUser.id === qrOwner.id) {
      return NextResponse.json({ 
        message: 'You cannot scan your own QR code! Share it with others to connect.' 
      }, { status: 400 });
    }
    
    // Check if this user (scanner) has already scanned this specific QR owner's hash
    // We only need to check the scanner's accomplishments to see if they've scanned this hash before
    const scannerAccomplishments = await getAccomplishmentsByType(scanningUser.id, 'social');
    const existingConnection = scannerAccomplishments.find(acc => {
      const metadata = acc.metadata as any;
      return metadata?.connected_with_hash === userHash;  // Check if scanner has already scanned this QR owner's hash
    });
    
    if (existingConnection) {
      return NextResponse.json({ 
        message: `You have already scanned ${qrOwner.displayname || qrOwner.email}'s QR code!` 
      }, { status: 400 });
    }
    
    const year = new Date().getFullYear();
    const timestamp = new Date().toISOString();
    
    // Create accomplishment for the QR code owner (Bob)
    const ownerAccomplishment = await createAccomplishment(
      qrOwner.id,
      qrOwner.email,
      {
        type: 'social',
        name: 'Meeting other rabbits!',
        description: `Connected with ${scanningUser.displayname || scanningUser.email} through QR code`,
        completedAt: Date.now(),
        year: year,
        metadata: {
          flag_type: 'social',
          scanned_at: timestamp,
          connected_with_hash: scanningUser.hash,  // Store Alice's hash in Bob's accomplishment
          connected_with_email: scanningUser.email,
          connected_with_displayname: scanningUser.displayname || scanningUser.email,
        },
      }
    );
    
    // Create accomplishment for the person scanning (Alice)
    const scannerAccomplishment = await createAccomplishment(
      scanningUser.id,
      scanningUser.email,
      {
        type: 'social',
        name: 'Meeting other rabbits!',
        description: `Connected with ${qrOwner.displayname || qrOwner.email} through QR code`,
        completedAt: Date.now(),
        year: year,
        metadata: {
          flag_type: 'social',
          scanned_at: timestamp,
          connected_with_hash: userHash,  // Store Bob's hash in Alice's accomplishment
          connected_with_email: qrOwner.email,
          connected_with_displayname: qrOwner.displayname || qrOwner.email,
        },
      }
    );
    
    return NextResponse.json(
      { 
        message: `Successfully connected with ${qrOwner.displayname || qrOwner.email}!`,
        ownerAccomplishment,
        scannerAccomplishment,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing rabbit QR code:', error);
    return NextResponse.json(
      { message: 'Failed to process QR code' },
      { status: 500 }
    );
  }
}