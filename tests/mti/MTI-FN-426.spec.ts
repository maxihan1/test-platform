import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리지우기, 시험도메인 } from './helpers/admin.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-426',
  name: 'POST /api/v1/admin/domain_blocks 를 어드민 키로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['어드민 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ admin, expected }) => {
  const 도메인 = 시험도메인();
  let 번호 = '';
  try {
    await test.step('POST /api/v1/admin/domain_blocks 를 어드민 키로 부른다', async () => {
      const 응답 = await admin.post('/api/v1/admin/domain_blocks', { data: { domain: 도메인, severity: 'noop' } });
      await verify('POST /api/v1/admin/domain_blocks 를 어드민 키로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
      번호 = ((await 응답.json()) as { id?: string }).id ?? '';
    });
  } finally {
    await 관리지우기(admin, '/api/v1/admin/domain_blocks', 번호);
  }
});
