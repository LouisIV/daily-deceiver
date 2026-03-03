import { createFlagsDiscoveryEndpoint } from 'flags/next';
import { getProviderData as getPostHogProviderData } from '@flags-sdk/posthog';
import * as flags from '../../../../flags';

export const GET = createFlagsDiscoveryEndpoint(() =>
  getPostHogProviderData({
    personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY ?? '',
    projectId: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID ?? '',
  })
);
