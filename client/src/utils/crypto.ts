import { getToken } from './auth';

/**
 * Utility for client-side encryption of cached data.
 * Uses AES-GCM (Authenticated Encryption) via the Web Crypto API.
 * The key is derived from the user's session token to ensure persistence across refreshes.
 */

let cachedKey: CryptoKey | null = null;
let lastUsedToken: string | null = null;

/**
 * Derives a CryptoKey from the session token using PBKDF2.
 */
async function getEncryptionKey(): Promise<CryptoKey | null> {
  const token = getToken();
  if (!token) return null;

  // If the token hasn't changed, reuse the cached key
  if (cachedKey && lastUsedToken === token) {
    return cachedKey;
  }

  try {
    const encoder = new TextEncoder();
    const tokenData = encoder.encode(token);
    
    // Import the raw token as a base key
    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      tokenData,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive the actual AES-GCM key
    // We use a static salt because the goal is persistence across refreshes for the same user
    const salt = encoder.encode('deezcord-session-salt-2026');
    
    cachedKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    lastUsedToken = token;
    return cachedKey;
  } catch (err) {
    console.error('Key derivation failed:', err);
    return null;
  }
}

/**
 * Encrypts a JSON object into a base64-encoded string.
 */
export async function encryptData(data: unknown): Promise<string> {
  try {
    const key = await getEncryptionKey();
    if (!key) throw new Error('No encryption key available');

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(JSON.stringify(data));

    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encodedData
    );

    // Combine IV and ciphertext for storage
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Convert to Base64 for string storage
    // Using a more robust base64 conversion for binary data
    return btoa(Array.from(combined, byte => String.fromCharCode(byte)).join(''));
  } catch (err) {
    console.error('Encryption failed:', err);
    throw new Error('Failed to secure data', { cause: err });
  }
}

/**
 * Decrypts a base64-encoded string back into a JSON object.
 */
export async function decryptData(base64Data: string): Promise<unknown> {
  try {
    const key = await getEncryptionKey();
    if (!key) return null;

    // Convert Base64 back to Uint8Array
    const binaryString = atob(base64Data);
    const combined = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      ciphertext
    );

    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch (err) {
    // Only log if it's not a standard decryption failure (which happens after logout/token change)
    if (!(err instanceof DOMException)) {
      console.error('Unexpected decryption failure:', err);
    }
    return null;
  }
}
