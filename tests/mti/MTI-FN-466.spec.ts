import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-466',
  name: 'POST /api/v1/admin/canonical_email_blocks/test 를 어드민 키로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['어드민 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ admin, expected }) => {
  await test.step('POST /api/v1/admin/canonical_email_blocks/test 를 어드민 키로 부른다', async () => {
    const 응답 = await admin.post(`/api/v1/admin/canonical_email_blocks/test`, { data: { email: 'mti-test@example.com' } });
    await verify('POST /api/v1/admin/canonical_email_blocks/test 를 어드민 키로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});
