import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@auth';
import { getUser, updateUser } from '@db/user';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUser(session.user.email);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { radioId } = await req.json();

    if (!radioId) {
      return NextResponse.json({ error: 'Radio ID is required' }, { status: 400 });
    }

    const currentRadios = user.meshtasticRadios || [];
    const radioIndex = currentRadios.findIndex((r: any) => r.id === radioId);

    if (radioIndex === -1) {
      return NextResponse.json({ error: 'Radio not found' }, { status: 404 });
    }

    const radio = currentRadios[radioIndex];

    // Check if radio is already verified
    if (radio.verified) {
      return NextResponse.json({ error: 'Radio is already verified' }, { status: 400 });
    }

    // Check verification attempts limit
    const verificationAttempts = radio.verificationAttempts || 0;
    if (verificationAttempts >= 5) {
      return NextResponse.json({ error: 'Maximum verification attempts exceeded (5). Cannot resend code.' }, { status: 429 });
    }

    // Check resend attempts limit
    const resendAttempts = radio.resendAttempts || 0;
    if (resendAttempts >= 3) {
      return NextResponse.json({ error: 'Maximum resend attempts exceeded (3)' }, { status: 429 });
    }

    // Generate new verification code
    const newVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Update radio with new code and increment resend attempts
    radio.verificationCode = newVerificationCode;
    radio.resendAttempts = resendAttempts + 1;

    currentRadios[radioIndex] = radio;

    await updateUser({
      email: session.user.email,
      meshtasticRadios: currentRadios,
    });

    return NextResponse.json({ radio });
  } catch (error) {
    console.error('Error resending verification code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}