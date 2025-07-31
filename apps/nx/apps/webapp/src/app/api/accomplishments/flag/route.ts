import { auth } from '@auth';
import { getUser } from '@db/user';
import { createAccomplishment, checkDuplicateAccomplishment } from '@db/accomplishment';
import { NextRequest, NextResponse } from 'next/server';
import { strapi } from '@components/cms/data';
import { validateTOTP } from './otp';

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

    // Validate flag against Strapi data
    const validationResult = await validateFlag(ctfId, otpCode, flag.trim());
    
    if (!validationResult.isValid) {
      return NextResponse.json(
        { message: validationResult.error || 'Invalid flag or OTP code for this challenge' },
        { status: 400 }
      );
    }

    // Check for duplicate accomplishment
    const year = new Date().getFullYear();
    const accomplishmentName = `CTF Challenge: ${validationResult.ghostName}`;
    const isDuplicate = await checkDuplicateAccomplishment(
      user.id,
      'meshctf',
      accomplishmentName,
      year
    );
    
    if (isDuplicate) {
      return NextResponse.json(
        { message: "Once is enough, don't you think?", isDuplicate: true },
        { status: 400 }
      );
    }

    // Create accomplishment record
    const accomplishment = await createAccomplishment(
      user.id,
      session.user.email,
      {
        type: 'meshctf',
        name: accomplishmentName,
        description: `Completed CTF challenge ${validationResult.ghostName} (${ctfId})`,
        completedAt: Date.now(),
        year: year,
        metadata: {
          otp_code: otpCode,
          flag: flag.trim(),
          ctf_id: ctfId,
          ghost_handle: ctfId,
          ghost_name: validationResult.ghostName,
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

type ValidationResult = {
  isValid: boolean;
  error?: string;
  ghostName?: string;
};

// Validate flag against Strapi ghost data
async function validateFlag(ctfId: string, otpCode: string, flag: string): Promise<ValidationResult> {
  try {
    // Fetch ghost data from Strapi
    const ghosts = await strapi('/ghosts?populate=*');
    
    if (!ghosts.data || !Array.isArray(ghosts.data)) {
      console.error('Invalid ghost data from Strapi');
      return { isValid: false, error: 'Unable to fetch challenge data' };
    }
    
    // Find the ghost matching the ctfId (which is the handle)
    const ghost = ghosts.data.find((g: any) => 
      g && g.handle === ctfId
    );
    
    if (!ghost) {
      console.error(`Ghost not found for ctfId: ${ctfId}`);
      return { isValid: false, error: 'Keep this up and you\'ll get banned.' };
    }
    
    const ghostName = ghost.name || ctfId;
    
    // Check if the OTP code matches
    if (ghost.otp_url) {
      if (!otpCode || otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
        return { isValid: false, error: 'Keep this up and you\'ll get banned.' };
      }
      
      // Validate TOTP with window of 1 (allows one period before/after current)
      try {
        const isValidOTP = validateTOTP(ghost.otp_url, otpCode, 1);
        if (!isValidOTP) {
          return { isValid: false, error: 'Keep this up and you\'ll get banned.' };
        }
      } catch (otpError) {
        console.error('OTP validation error:', otpError);
        return { isValid: false, error: 'Keep this up and you\'ll get banned.' };
      }
    }
    
    // Check if the flag matches
    if (ghost.flag && ghost.flag === flag) {
      return { isValid: true, ghostName };
    }
    
    return { isValid: false, error: 'Keep this up and you\'ll get banned.' };
  } catch (error) {
    console.error('Error validating flag:', error);
    return { isValid: false, error: 'Keep this up and you\'ll get banned.' };
  }
}