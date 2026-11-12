import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리지우기, 시험도메인 } from './helpers/admin.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-564',
  name: '같은 도메인 차단을 두 번 더하면 두 번째 응답 코드가 422 다',
  apiDoc: 1,
  precondition: ['어드민 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(422),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ admin, expected }) => {
  const 도메인 = 시험도메인();
  let 번호 = '';
  try {
    await test.step('POST /api/v1/admin/domain_blocks 로 같은 도메인을 두 번 더한다', async () => {
      const 첫째 = await admin.post('/api/v1/admin/domain_blocks', { data: { domain: 도메인, severity: 'noop' } });
      번호 = ((await 첫째.json()) as { id?: string }).id ?? '';
      const 둘째 = await admin.post('/api/v1/admin/domain_blocks', { data: { domain: 도메인, severity: 'noop' } });
      await verify('같은 도메인 차단을 두 번 더하면 두 번째 응답 코드가 422 다', 둘째.status(), expected.응답코드);
    });
  } finally {
    await 관리지우기(admin, '/api/v1/admin/domain_blocks', 번호);
  }
});
