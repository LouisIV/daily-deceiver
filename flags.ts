import { flag } from 'flags/next';
import { postHogAdapter } from '@flags-sdk/posthog';
import { identify } from '@/lib/identify';

type NumberOfQuestionsFlag = { "num-questions": number };

export const numberOfQuestions = flag<NumberOfQuestionsFlag>({
  key: 'number-of-questions',
  defaultValue: { "num-questions": 10 },
  adapter: postHogAdapter.featureFlagPayload((v) => v as NumberOfQuestionsFlag),
  identify,
});
