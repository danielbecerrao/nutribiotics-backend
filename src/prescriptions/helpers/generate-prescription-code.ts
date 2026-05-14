import { randomUUID } from 'crypto';

export function generatePrescriptionCode(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  const suffix = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

  return `RX-${year}${month}${day}-${suffix}`;
}
