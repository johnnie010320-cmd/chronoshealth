import { z } from 'zod';

// services/gateway/src/schemas/signup.ts와 동기. P1 후반 packages/types로 이동 예정.

const PHONE_REGEX = /^(\+\d{7,17}|0\d{1,2}-\d{3,4}-\d{4})$/;

export const SignupRequest = z
  .object({
    name: z.string().trim().min(1).max(40),
    email: z.string().email().max(254),
    phone: z.string().regex(PHONE_REGEX),
    birthYear: z.number().int().min(1900),
    sex: z.enum(['male', 'female', 'other']),
    consentMedical: z.boolean(),
    consentTerms: z.boolean(),
  })
  .refine(
    (v) => new Date().getFullYear() - v.birthYear >= 19,
    { path: ['birthYear'], message: 'AGE_RESTRICTED' },
  );

export type SignupRequest = z.infer<typeof SignupRequest>;

export type SignupResponse = {
  userPseudonymId: string;
  sessionToken: string;
  expiresAt: string;
};
