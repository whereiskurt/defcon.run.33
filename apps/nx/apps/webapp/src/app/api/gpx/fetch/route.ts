import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { message: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Validate that it's a GPX file URL
    if (!url.includes('.gpx')) {
      return NextResponse.json(
        { message: 'URL must be for a GPX file' },
        { status: 400 }
      );
    }

    // Fetch the GPX file from the remote URL
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml, */*',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: `Failed to fetch GPX: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const gpxContent = await response.text();

    // Return the GPX content with proper CORS headers
    return new NextResponse(gpxContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error fetching GPX:', error);
    return NextResponse.json(
      { message: 'Failed to fetch GPX file' },
      { status: 500 }
    );
  }
}