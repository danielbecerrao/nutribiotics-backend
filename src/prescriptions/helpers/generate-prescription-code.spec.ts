import { generatePrescriptionCode } from './generate-prescription-code';

describe('generatePrescriptionCode', () => {
  it('generates a prescription code with date prefix and random suffix', () => {
    expect(
      generatePrescriptionCode(new Date('2026-05-14T12:00:00.000Z')),
    ).toMatch(/^RX-20260514-[A-F0-9]{8}$/);
  });
});
