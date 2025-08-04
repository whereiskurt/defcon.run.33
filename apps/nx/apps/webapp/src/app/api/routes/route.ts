import { NextRequest, NextResponse } from 'next/server';
import { strapi } from '@components/cms/data';
import { auth } from '@auth';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user.email) {
    return NextResponse.json({ message: '401 Unauthorized' }, { status: 401 });
  }
  try {
    const routes = await strapi("/routes?populate=*");
    
    console.log('Raw Strapi routes data:', JSON.stringify(routes.data?.[0], null, 2));
    
    // Transform routes data to include just the info we need
    const routeOptions = routes.data.map((route: any) => {
      const attributes = route.attributes || route;
      let distanceDisplay = 'Unknown distance';
      
      // Convert distance based on unit from Strapi - display everything in KM
      if (attributes.distance && attributes.distanceUnit) {
        const distance = parseFloat(attributes.distance);
        const unit = attributes.distanceUnit.toLowerCase();
        let distanceInKm = 0;
        
        switch (unit) {
          case 'km':
          case 'kilometers':
          case 'kilometres':
            distanceInKm = distance;
            break;
          case 'miles':
          case 'mi':
            distanceInKm = distance * 1.60934; // Convert miles to km
            break;
          case 'steps':
          case 'meters':
          case 'metres':
          case 'm':
            distanceInKm = distance / 1000; // Convert meters to km
            break;
          default:
            console.warn(`Unknown distance unit: ${attributes.distanceUnit}, treating as kilometers`);
            distanceInKm = distance;
        }
        
        // Format distance display - show 1 decimal place for precision
        distanceDisplay = `${distanceInKm.toFixed(1)}km`;
      }
      
      const routeName = attributes.name || attributes.title || `Route ${route.id}`;
      const routeDescription = attributes.description ? ` - ${attributes.description}` : '';
      
      return {
        id: route.id,
        name: routeName,
        distance: distanceDisplay,
        label: `${routeName} (${distanceDisplay})${routeDescription}`,
        attributes: attributes // Include full attributes for debugging
      };
    });

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