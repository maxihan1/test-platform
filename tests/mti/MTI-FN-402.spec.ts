import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입계정지우기, 관리계정번호 } from './helpers/account.helper.js';
import { 승인대기계정만들기 } from './helpers/manage.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-402',
  name: 'POST /api/v1/admin/accounts/{id}/approve 를 어드민 키로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['어드민 키가 있다', '승인 대기 시험 계정이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, admin, expected }) => {
  const 이름 = await 승인대기계정만들기(request, admin);
  const 번호 = await 관리계정번호(admin, 이름);
  try {
    await test.step('승인 대기 시험 계정 번호를 확인한다', async () => {
      await verify('승인 대기 시험 계정이 있다', 번호 !== '', true, { blocker: true });
    });
    await test.step('POST /api/v1/admin/accounts/{id}/approve 를 어드민 키로 부른다', async () => {
      const 응답 = await admin.post(`/api/v1/admin/accounts/${번호}/approve`);
      await verify('POST /api/v1/admin/accounts/{id}/approve 를 어드민 키로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 가입계정지우기(admin, 이름);
  }
});
