import { auth } from '@auth';
import { getUser } from '@db/user';
import { createAccomplishment } from '@db/accomplishment';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user.email) {
    return NextResponse.json({ message: '401 Unauthorized' }, { status: 401 });
  }

  try {
    const { ctfId, otpCode, flag } = await req.json();
    
    // Validate required fields
    if (!ctfId || typeof ctfId !== 'string') {
      return NextResponse.json(
        { message: 'CTF challenge selection is required' },
        { status: 400 }
      );
    }

    if (!otpCode || typeof otpCode !== 'string' || !/^\d{6}$/.test(otpCode)) {
      return NextResponse.json(
        { message: 'OTP code must be exactly 6 digits' },
        { status: 400 }
      );
    }

    if (!flag || typeof flag !== 'string' || flag.trim().length === 0) {
      return NextResponse.json(
        { message: 'Flag is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Get user to extract userId
    const user = await getUser(session.user.email);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // TODO: Add actual flag validation logic here
    // For now, we'll accept any flag as valid
    const isValidFlag = await validateFlag(ctfId, otpCode, flag.trim());
    
    if (!isValidFlag) {
      return NextResponse.json(
        { message: 'Invalid flag or OTP code for this challenge' },
        { status: 400 }
      );
    }

    // Create accomplishment record
    const accomplishment = await createAccomplishment(
      user.id,
      session.user.email,
      {
        type: 'meshctf',
        name: `CTF Challenge: ${ctfId}`,
        description: `Completed CTF challenge ${ctfId}`,
        completedAt: Date.now(),
        year: new Date().getFullYear(),
        metadata: {
          otp_code: otpCode,
          flag: flag.trim(),
          ctf_id: ctfId,
        },
      }
    );

    return NextResponse.json(
      { 
        message: 'Flag submitted successfully', 
        accomplishment 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error submitting flag:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Stub function for flag validation
// TODO: Replace with actual validation logic
async function validateFlag(ctfId: string, otpCode: string, flag: string): Promise<boolean> {
  // This is a stub implementation
  // In a real implementation, this would:
  // 1. Validate the OTP code for the specific CTF challenge
  // 2. Check if the flag is correct for the challenge
  // 3. Potentially check if the user hasn't already submitted this flag
  // 4. Verify timing constraints, etc.
  
  // For now, accept all flags that follow basic patterns
  if (flag.startsWith('flag{') && flag.endsWith('}') && flag.length > 10) {
    return true;
  }
  
  // Also accept DEFCON-style flags
  if (flag.startsWith('DEFCON{') && flag.endsWith('}') && flag.length > 15) {
    return true;
  }
  
  return false;
}