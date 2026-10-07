import { createHash } from 'node:crypto';

// Adgangskode til Studio. Kan overskrives med miljøvariablen STUDIO_PASSWORD.
export const STUDIO_PASSWORD = process.env.STUDIO_PASSWORD || '123';
export const AUTH_COOKIE = 'studio_auth';

export const authToken = (password = STUDIO_PASSWORD) => createHash('sha256').update(`studio:${password}`).digest('hex');
