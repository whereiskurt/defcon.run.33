import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
//   if (req.nextUrl.pathname.endsWith('.gpx')) {
//     try {
//       const sessionToken = req.cookies.get('sess')?.value

//       if (!sessionToken) {
//         const token = await getToken({ 
//           req: req as any,
//           secret: process.env.NEXTAUTH_SECRET 
//         });
        
//         if (!token) {
//           return NextResponse.redirect(new URL('/api/auth/signin', req.url));
//         }
//       }
//     } catch (error) {
//       return NextResponse.redirect(new URL('/api/auth/signin', req.url));
//     }
//   }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/routes/:path*', '/public/routes/:path*']
};
