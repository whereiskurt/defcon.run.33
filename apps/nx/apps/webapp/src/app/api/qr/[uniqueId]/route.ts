import { auth } from '@auth';
import { getUser, updateUser } from '@db/user';
import { createAccomplishment, getAccomplishmentsByType, getAllAccomplishmentsForType, checkDuplicateAccomplishment, getAccomplishmentsByUser } from '@db/accomplishment';
import { NextRequest, NextResponse } from 'next/server';
import { strapi } from '@components/cms/data';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uniqueId: string }> }
) {
  const session = await auth();
  if (!session || !session.user.email) {
    return NextResponse.json({ message: '401 Unauthorized' }, { status: 401 });
  }

  try {
    const { uniqueId } = await params;
    
    if (!uniqueId) {
      return NextResponse.json(
        { message: 'Invalid QR code' },
        { status: 400 }
      );
    }

    // Get user to extract userId
    const user = await getUser(session.user.email);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Check QR scan quota
    const allUserAccomplishments = await getAccomplishmentsByUser(user.id);
    const hasAccomplishments = allUserAccomplishments && allUserAccomplishments.length > 0;
    
    // Determine quota limit based on accomplishments
    const quotaLimit = hasAccomplishments ? 100 : 5;
    const currentQrScans = user.quota?.qrScans || 0;
    
    // Check if user has exceeded their quota
    if (currentQrScans >= quotaLimit) {
      const message = hasAccomplishments 
        ? `You have reached your lifetime limit of ${quotaLimit} QR scans`
        : `You have reached your limit of ${quotaLimit} QR scans. Complete some accomplishments to increase your limit to 100!`;
      
      return NextResponse.json({ 
        message,
        quotaExceeded: true,
        currentUsage: currentQrScans,
        quotaLimit 
      }, { status: 429 });
    }

    // Fetch qrflags from Strapi
    let qrflagsResponse;
    try {
      qrflagsResponse = await strapi('/qrflags?populate=*');
    } catch (strapiError) {
      console.error('Failed to fetch qrflags from Strapi:', strapiError);
      return NextResponse.json({ message: 'QR code system is currently unavailable' }, { status: 503 });
    }
    
    if (!qrflagsResponse.data || !Array.isArray(qrflagsResponse.data)) {
      console.error('Invalid qrflags data from Strapi:', qrflagsResponse);
      return NextResponse.json({ message: 'Unable to fetch QR data' }, { status: 500 });
    }
    
    // Find the qrflag matching the unique_id
    const qrflag = qrflagsResponse.data.find((qr: any) => 
      qr && qr.unique_id === uniqueId
    );
    
    if (!qrflag) {
      return NextResponse.json({ message: 'Invalid or expired QR code' }, { status: 404 });
    }

    // Check if expired by date
    const today = new Date();
    const expiryDate = new Date(qrflag.expiry_date);
    if (expiryDate < today) {
      return NextResponse.json({ message: 'This QR code has expired' }, { status: 410 });
    }

    // Check if manually disabled
    if (qrflag.is_expired === true) {
      return NextResponse.json({ message: 'This QR code has been disabled' }, { status: 410 });
    }

    // Validate and default flag_type with defensive programming
    const validTypes = ['activity', 'social', 'meshctf'] as const;
    let flagType: 'activity' | 'social' | 'meshctf' = 'activity';
    
    if (qrflag.flag_type && validTypes.includes(qrflag.flag_type)) {
      flagType = qrflag.flag_type;
    } else {
      if (qrflag.flag_type) {
        console.warn(`Invalid flag_type: ${qrflag.flag_type} for QR flag: ${uniqueId}, defaulting to 'activity'`);
      }
      // flagType already defaults to 'activity'
    }

    // Check total usage limit by querying all accomplishments of the specific type
    if (qrflag.max_total_uses) {
      // Query all accomplishments of this flag type and count those with this QR flag ID
      const allAccomplishments = await getAllAccomplishmentsForType(flagType);
      const totalQRUses = allAccomplishments.filter(acc => 
        acc.metadata?.qr_flag_id === uniqueId
      ).length;

      if (totalQRUses >= qrflag.max_total_uses) {
        return NextResponse.json({ message: 'This QR code has reached its maximum uses' }, { status: 410 });
      }
    }

    // Check per-user usage limit by counting existing accomplishments of the specific type
    // This is our primary duplicate prevention mechanism for QR codes
    const userAccomplishments = await getAccomplishmentsByType(user.id, flagType);
    const qrAccomplishmentCount = userAccomplishments.filter(acc => 
      acc.metadata?.qr_flag_id === uniqueId
    ).length;

    if (qrflag.max_uses_per_user && qrAccomplishmentCount >= qrflag.max_uses_per_user) {
      return NextResponse.json({ message: 'You have already claimed this QR code the maximum number of times' }, { status: 400 });
    }

    // For race condition protection, double-check both limits right before creating
    // This prevents simultaneous requests from both succeeding
    
    // Recheck total usage limit
    if (qrflag.max_total_uses) {
      const freshAllAccomplishments = await getAllAccomplishmentsForType(flagType);
      const freshTotalQRUses = freshAllAccomplishments.filter(acc => 
        acc.metadata?.qr_flag_id === uniqueId
      ).length;

      if (freshTotalQRUses >= qrflag.max_total_uses) {
        return NextResponse.json({ message: 'This QR code has reached its maximum uses' }, { status: 410 });
      }
    }

    // Recheck per-user usage limit
    if (qrflag.max_uses_per_user) {
      const freshUserAccomplishments = await getAccomplishmentsByType(user.id, flagType);
      const freshQrCount = freshUserAccomplishments.filter(acc => 
        acc.metadata?.qr_flag_id === uniqueId
      ).length;
      
      if (freshQrCount >= qrflag.max_uses_per_user) {
        return NextResponse.json({ message: 'You have already claimed this QR code the maximum number of times' }, { status: 400 });
      }
    }

    // Create accomplishment record with the correct type
    const year = new Date().getFullYear();
    const currentClaimNumber = qrAccomplishmentCount + 1;
    const baseName = qrflag.accomplishment_name || `QR Code: ${qrflag.name}`;
    const accomplishmentName = qrflag.max_uses_per_user && qrflag.max_uses_per_user > 1 
      ? `${baseName} (${currentClaimNumber})`
      : baseName;
    const accomplishmentDescription = qrflag.accomplishment_description || 
      `Found QR code ${qrflag.name}${qrflag.location ? ` at ${qrflag.location}` : ''}`;

    const accomplishment = await createAccomplishment(
      user.id,
      session.user.email,
      {
        type: flagType,
        name: accomplishmentName,
        description: accomplishmentDescription,
        completedAt: Date.now(),
        year: year,
        metadata: {
          qr_flag_id: uniqueId,
          qr_flag_name: qrflag.name,
          flag_type: flagType,
          ...(qrflag.location && { location: qrflag.location }),
          points: qrflag.points || 1,
          scanned_at: new Date().toISOString(),
        },
      }
    );

    // Update user's QR scan quota usage
    await updateUser({
      email: session.user.email,
      quota: {
        ...user.quota,
        qrScans: currentQrScans + 1
      }
    });

    // Usage count is now calculated dynamically from DynamoDB accomplishments

    return NextResponse.json(
      { 
        message: qrflag.success_message || 'QR code successfully claimed!',
        accomplishment,
        points: qrflag.points || 1,
        quotaUsed: currentQrScans + 1,
        quotaLimit,
        quotaRemaining: quotaLimit - (currentQrScans + 1)
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing QR code:', error);
    
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}