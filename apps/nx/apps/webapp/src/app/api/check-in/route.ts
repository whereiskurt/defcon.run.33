import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@auth';
import { getUserById, updateUser } from '@db/user';

interface GPSSample {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

interface CheckIn {
  date?: string;
  timestamp: number;
  source: string;
  samples: GPSSample[];
  averageCoordinates: {
    latitude: number;
    longitude: number;
  };
  bestAccuracy: number;
  userAgent?: string;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { samples, source, userAgent } = await request.json();

    if (!samples || !Array.isArray(samples) || samples.length === 0) {
      return NextResponse.json({ error: 'Invalid samples data' }, { status: 400 });
    }

    // Calculate average coordinates from all samples
    const avgLat = samples.reduce((sum: number, s: GPSSample) => sum + s.latitude, 0) / samples.length;
    const avgLng = samples.reduce((sum: number, s: GPSSample) => sum + s.longitude, 0) / samples.length;
    const bestAccuracy = Math.min(...samples.map((s: GPSSample) => s.accuracy));

    // Create check-in object
    const checkIn: CheckIn = {
      date: new Date().toISOString(),
      timestamp: Date.now(),
      source: source || 'Web GPS',
      samples: samples,
      averageCoordinates: {
        latitude: avgLat,
        longitude: avgLng
      },
      bestAccuracy: bestAccuracy,
      userAgent: userAgent
    };

    // Get current user data
    const user = await getUserById(session.user.email);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check check-in quota
    const currentQuota = user.quota?.checkIns ?? 50;
    
    if (currentQuota <= 0) {
      return NextResponse.json({ 
        error: 'Check-in quota exceeded. You have reached the maximum number of check-ins allowed.' 
      }, { status: 429 });
    }

    // Get existing check-ins or initialize empty array
    const existingCheckIns = user.checkIns || [];
    
    // Add new check-in to the beginning of the array (most recent first)
    const updatedCheckIns = [checkIn, ...existingCheckIns];

    // Limit to last 100 check-ins to prevent unlimited growth
    const limitedCheckIns = updatedCheckIns.slice(0, 100);

    // Update user with new check-ins and decremented quota
    await updateUser({
      email: session.user.email,
      checkIns: limitedCheckIns,
      quota: {
        ...user.quota,
        checkIns: currentQuota - 1
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Check-in recorded successfully',
      checkIn: {
        date: checkIn.date,
        coordinates: checkIn.averageCoordinates,
        accuracy: checkIn.bestAccuracy,
        samplesCollected: samples.length
      }
    });

  } catch (error) {
    console.error('Error processing check-in:', error);
    return NextResponse.json(
      { error: 'Failed to process check-in' },
      { status: 500 }
    );
  }
}