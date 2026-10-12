import { z } from 'zod';

export const verify = z.object({
  providerOrderId: z.string().min(5),
  providerPaymentId: z.string().min(3).optional(),
  signature: z.string().optional(),
});
