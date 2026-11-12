import * as Crypto from 'expo-crypto';
export const newRequestId = () => Crypto.randomUUID();
