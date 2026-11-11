import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-498',
  name: 'POST /api/v1/admin/measures 를 어드민 키로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['어드민 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ admin, expected }) => {
  await test.step('POST /api/v1/admin/measures 를 어드민 키로 부른다', async () => {
    const 응답 = await admin.post(`/api/v1/admin/measures`, { data: { keys: ['active_users'], start_at: '2026-10-01', end_at: '2026-10-31' } });
    await verify('POST /api/v1/admin/measures 를 어드민 키로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});
