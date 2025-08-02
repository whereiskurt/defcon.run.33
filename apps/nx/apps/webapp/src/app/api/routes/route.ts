import { NextRequest, NextResponse } from 'next/server';
import { strapi } from '@components/cms/data';

export async function GET(req: NextRequest) {
  try {
    const routes = await strapi("/routes?populate=*");
    
    // Transform routes data to include just the info we need
    const routeOptions = routes.data.map((route: any) => ({
      id: route.id,
      name: route.name,
      distance: route.distance_km ? `${route.distance_km}km` : 'Unknown distance',
      label: `${route.name} (${route.distance_km ? route.distance_km + 'km' : 'Unknown distance'})`
    }));

    return NextResponse.json({
      routes: routeOptions
    });

  } catch (error) {
    console.error('Error fetching routes:', error);
    return NextResponse.json(
      { message: 'Failed to fetch routes' },
      { status: 500 }
    );
  }
}