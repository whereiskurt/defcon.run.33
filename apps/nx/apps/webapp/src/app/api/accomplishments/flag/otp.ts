import crypto from 'crypto';

/**
 * Validates a TOTP code against an OTP URL
 * @param otpUrl - The OTP URL in format: otpauth://totp/...?secret=BASE32SECRET&...
 * @param code - The 6-digit code to validate
 * @param window - Number of time windows to check (before and after current)
 * @returns true if the code is valid
 */
export function validateTOTP(otpUrl: string, code: string, window: number = 1): boolean {
  console.log('Validating TOTP:', { otpUrl, code, window });
  try {
    // Parse the OTP URL to extract the secret
    const url = new URL(otpUrl);
    if (url.protocol !== 'otpauth:' || url.host !== 'totp') {
      console.error('Invalid OTP URL format');
      return false;
    }

    const secret = url.searchParams.get('secret');
    if (!secret) {
      console.error('No secret found in OTP URL');
      return false;
    }

    // Get period (default 30 seconds)
    const period = parseInt(url.searchParams.get('period') || '30');
    
    // Get digits (default 6)
    const digits = parseInt(url.searchParams.get('digits') || '6');
    
    // Algorithm (default SHA1)
    const algorithm = (url.searchParams.get('algorithm') || 'SHA1').toLowerCase();
    const hashAlgorithm = algorithm === 'sha256' ? 'sha256' : algorithm === 'sha512' ? 'sha512' : 'sha1';

    // Convert base32 secret to buffer
    const secretBuffer = base32Decode(secret);

    // Get current time counter
    const currentTime = Math.floor(Date.now() / 1000);
    const currentCounter = Math.floor(currentTime / period);

    // Check current time window and adjacent windows
    console.log('Current time counter:', currentCounter, 'Time:', new Date().toISOString());
    for (let i = -window; i <= window; i++) {
      const counter = currentCounter + i;
      const generatedCode = generateTOTP(secretBuffer, counter, digits, hashAlgorithm);
      console.log(`Window ${i}: counter=${counter}, generated=${generatedCode}, input=${code}`);
      
      if (generatedCode === code) {
        console.log('TOTP validation successful!');
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error validating TOTP:', error);
    return false;
  }
}

/**
 * Generates a TOTP code for a given counter value
 */
function generateTOTP(secret: Buffer, counter: number, digits: number, algorithm: string): string {
  console.log('Generating TOTP:', { counter, digits, algorithm, secretLength: secret.length });
  // Convert counter to 8-byte buffer (big-endian)
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  // Generate HMAC
  const hmac = crypto.createHmac(algorithm, secret as any);
  hmac.update(counterBuffer as any);
  const hash = hmac.digest();

  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0x0f;
  const truncated = (hash[offset] & 0x7f) << 24 |
                   (hash[offset + 1] & 0xff) << 16 |
                   (hash[offset + 2] & 0xff) << 8 |
                   (hash[offset + 3] & 0xff);

  // Generate final code
  const code = truncated % Math.pow(10, digits);
  const result = code.toString().padStart(digits, '0');
  console.log('Generated TOTP code:', result);
  return result;
}

/**
 * Decodes a base32 string to a buffer
 * Base32 alphabet: ABCDEFGHIJKLMNOPQRSTUVWXYZ234567
 */
function base32Decode(encoded: string): Buffer {
  const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = encoded.toUpperCase().replace(/[\s-]/g, '');
  
  let bits = 0;
  let value = 0;
  let index = 0;
  const output = new Uint8Array(Math.floor(cleaned.length * 5 / 8));

  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '=') break; // Padding
    
    const charIndex = base32Alphabet.indexOf(cleaned[i]);
    if (charIndex === -1) {
      throw new Error(`Invalid base32 character: ${cleaned[i]}`);
    }

    value = (value << 5) | charIndex;
    bits += 5;

    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 0xff;
      bits -= 8;
    }
  }

  return Buffer.from(output.slice(0, index));
}