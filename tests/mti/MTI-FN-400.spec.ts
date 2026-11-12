import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가입계정지우기, 가입하기, 관리계정번호 } from './helpers/account.helper.js';
import { 관리계정조치 } from './helpers/manage.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-400',
  name: 'POST /api/v1/admin/accounts/{id}/unsuspend 를 어드민 키로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['어드민 키가 있다', '가입으로 만든 시험 계정이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, admin, expected }) => {
  const 가입 = await 가입하기(request);
  const 번호 = await 관리계정번호(admin, 가입.username);
  try {
    await test.step('가입으로 만든 시험 계정 번호를 확인한다', async () => {
      await verify('가입으로 만든 시험 계정이 있다', 번호 !== '', true, { blocker: true });
    });
    await 관리계정조치(admin, 번호, 'suspend');
    await test.step('POST /api/v1/admin/accounts/{id}/unsuspend 를 어드민 키로 부른다', async () => {
      const 응답 = await admin.post(`/api/v1/admin/accounts/${번호}/unsuspend`);
      await verify('POST /api/v1/admin/accounts/{id}/unsuspend 를 어드민 키로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 가입계정지우기(admin, 가입.username);
  }
});
