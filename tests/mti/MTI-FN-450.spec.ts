import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리아이피차단만들기, 관리지우기 } from './helpers/admin.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-450',
  name: 'GET /api/v1/admin/ip_blocks/{id} 를 어드민 키로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['어드민 키가 있다', '관리 API 로 만든 IP 차단이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ admin, expected }) => {
  let 번호 = '';
  번호 = await 관리아이피차단만들기(admin);
  try {
    await test.step('시험 IP 차단 번호를 확인한다', async () => {
      await verify('관리 API 로 만든 IP 차단이 있다', 번호 !== '', true, { blocker: true });
    });
    await test.step('GET /api/v1/admin/ip_blocks/{id} 를 어드민 키로 부른다', async () => {
      const 응답 = await admin.get(`/api/v1/admin/ip_blocks/${번호}`);
      await verify('GET /api/v1/admin/ip_blocks/{id} 를 어드민 키로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 관리지우기(admin, '/api/v1/admin/ip_blocks', 번호);
  }
});
