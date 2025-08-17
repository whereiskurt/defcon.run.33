import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@auth';
import { getUser, updateUser } from '@db/user';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUser(session.user.email);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      radios: user.meshtasticRadios || [],
      quota: {
        used: user.quota?.meshtasticRadiosUsed || 0,
        total: user.quota?.meshtasticRadios || 5
      }
    });
  } catch (error) {
    console.error('Error fetching radios:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function validateAndFormatNodeId(nodeId: string): { isValid: boolean; formatted: string } {
  if (!nodeId.trim()) return { isValid: false, formatted: nodeId };
  
  if (nodeId.startsWith('!')) {
    // Hex format validation
    const hexPart = nodeId.slice(1);
    if (!/^[0-9a-fA-F]+$/.test(hexPart)) return { isValid: false, formatted: nodeId };
    if (hexPart.length === 0 || hexPart.length > 8) return { isValid: false, formatted: nodeId };
    return { isValid: true, formatted: nodeId };
  } else {
    // Integer format validation and conversion
    const intValue = parseInt(nodeId, 10);
    if (isNaN(intValue) || intValue < 0 || intValue > 0xFFFFFFFF) return { isValid: false, formatted: nodeId };
    const hexValue = intValue.toString(16);
    return { isValid: true, formatted: `!${hexValue}` };
  }
}

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

    const { nodeId, privateKey, impersonate } = await req.json();

    if (!nodeId) {
      return NextResponse.json({ error: 'Node ID is required' }, { status: 400 });
    }

    const nodeIdValidation = validateAndFormatNodeId(nodeId);
    if (!nodeIdValidation.isValid) {
      return NextResponse.json({ error: 'Invalid NodeID. Must be hex (!1234abcd) or integer (≤32-bit)' }, { status: 400 });
    }

    if (impersonate && (!privateKey || !privateKey.trim())) {
      return NextResponse.json({ error: 'Private key is required when impersonation is enabled' }, { status: 400 });
    }

    const currentRadios = user.meshtasticRadios || [];
    const radioQuota = user.quota?.meshtasticRadios || 5;
    const radiosUsed = user.quota?.meshtasticRadiosUsed || 0;

    if (radiosUsed >= radioQuota) {
      return NextResponse.json({ error: 'Radio quota exceeded' }, { status: 403 });
    }

    // Use the formatted NodeID for storage and duplicate checking
    const formattedNodeId = nodeIdValidation.formatted;
    const existingRadio = currentRadios.find((r: any) => r.nodeId === formattedNodeId);
    if (existingRadio) {
      return NextResponse.json({ error: 'Radio with this Node ID already exists' }, { status: 409 });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const newRadio = {
      id: uuidv4(),
      nodeId: formattedNodeId,
      privateKey: privateKey || '',
      impersonate: impersonate || false,
      verificationCode,
      verified: false,
      createdAt: Date.now(),
      verificationAttempts: 0,
      resendAttempts: 0,
    };

    const updatedRadios = [...currentRadios, newRadio];

    await updateUser({
      email: session.user.email,
      meshtasticRadios: updatedRadios,
      quota: {
        ...user.quota,
        meshtasticRadiosUsed: radiosUsed + 1
      }
    });

    return NextResponse.json({ radio: newRadio });
  } catch (error) {
    console.error('Error adding radio:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUser(session.user.email);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { radioId, verificationCode, privateKey, impersonate } = await req.json();

    if (!radioId) {
      return NextResponse.json({ error: 'Radio ID is required' }, { status: 400 });
    }

    const currentRadios = user.meshtasticRadios || [];
    const radioIndex = currentRadios.findIndex((r: any) => r.id === radioId);

    if (radioIndex === -1) {
      return NextResponse.json({ error: 'Radio not found' }, { status: 404 });
    }

    const radio = currentRadios[radioIndex];

    if (verificationCode !== undefined) {
      // Check verification attempts limit
      const verificationAttempts = radio.verificationAttempts || 0;
      if (verificationAttempts >= 5) {
        return NextResponse.json({ error: 'Maximum verification attempts exceeded (5)' }, { status: 429 });
      }

      // Increment verification attempts
      radio.verificationAttempts = verificationAttempts + 1;

      if (radio.verificationCode === verificationCode) {
        radio.verified = true;
        radio.verifiedAt = Date.now();
      } else {
        // Save the failed attempt count
        currentRadios[radioIndex] = radio;
        await updateUser({
          email: session.user.email,
          meshtasticRadios: currentRadios,
        });
        return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
      }
    }

    if (privateKey !== undefined) {
      radio.privateKey = privateKey;
    }

    if (impersonate !== undefined) {
      radio.impersonate = impersonate;
    }

    currentRadios[radioIndex] = radio;

    await updateUser({
      email: session.user.email,
      meshtasticRadios: currentRadios,
    });

    return NextResponse.json({ radio });
  } catch (error) {
    console.error('Error updating radio:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const radioId = searchParams.get('radioId');

    if (!radioId) {
      return NextResponse.json({ error: 'Radio ID is required' }, { status: 400 });
    }

    const user = await getUser(session.user.email);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentRadios = user.meshtasticRadios || [];
    const updatedRadios = currentRadios.filter((r: any) => r.id !== radioId);

    if (currentRadios.length === updatedRadios.length) {
      return NextResponse.json({ error: 'Radio not found' }, { status: 404 });
    }

    await updateUser({
      email: session.user.email,
      meshtasticRadios: updatedRadios,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting radio:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}