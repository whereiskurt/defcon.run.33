import { cookies } from 'next/headers';
import crypto from 'crypto';

export const verifyCsrfToken = async (csrf: string): Promise<boolean> => {
  try {
    //This function may not be necessary but does work as describe. Next.js handles CSRF tokens automatically, apparently.
    const cookie = (await cookies()).get('csrf');
    if (!cookie || !cookie.value || cookie.value.length < 1) {
        throw new Error('1. Invalid CSRF token - not found');
    }

    const csrfCookie = cookie.value;
    const delim = csrfCookie.indexOf('|') !== -1 ? '|' : '%7C'; //TODO: Remember why I did this...

    const [csrfToken, requestHash] = csrfCookie.split(delim);

    if (csrfToken !== csrf || !requestHash) {
        throw new Error('2. Mismatch token or no hash');
    }

    const secrets = (process.env.AUTH_SECRET || '').split(',');
    for (const secret of secrets) {
      if (!secret) continue;

      const expectedHash = crypto
        .createHash('sha256')
        .update(`${csrfToken}${secret}`)
        .digest('hex');

      if (expectedHash === requestHash) {
        return true;
      }
    }
  } catch (err) {
    console.error('Caught: CSRF verification error: ', err);
  }

  return false;
};
