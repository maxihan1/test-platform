import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리지우기 } from './helpers/admin.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-699',
  name: 'ip 형식이 틀린 IP 차단을 더하면 응답 코드가 422 다',
  apiDoc: 1,
  precondition: ['어드민 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(422),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ admin, expected }) => {
  let 번호 = '';
  try {
    await test.step('ip 를 not-an-ip 로 POST /api/v1/admin/ip_blocks 를 부른다', async () => {
      const 응답 = await admin.post('/api/v1/admin/ip_blocks', { data: { ip: 'not-an-ip', severity: 'sign_up_block' } });
      await verify('ip 형식이 틀린 IP 차단을 더하면 응답 코드가 422 다', 응답.status(), expected.응답코드);
      번호 = ((await 응답.json()) as { id?: string }).id ?? '';
    });
  } finally {
    await 관리지우기(admin, '/api/v1/admin/ip_blocks', 번호);
  }
});
