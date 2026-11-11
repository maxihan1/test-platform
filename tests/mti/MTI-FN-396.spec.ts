import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리계정번호 } from './helpers/account.helper.js';
import { 관리계정조치 } from './helpers/manage.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-396',
  name: 'POST /api/v1/admin/accounts/{id}/unsensitive 를 어드민 키로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['어드민 키가 있다', '관리 API 에 두 번째 사용자 계정이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ admin, expected }) => {
  const 번호 = await 관리계정번호(admin, 'qa_user2');
  try {
    await test.step('두 번째 사용자 계정 번호를 확인한다', async () => {
      await verify('관리 API 에 두 번째 사용자 계정이 있다', 번호 !== '', true, { blocker: true });
    });
    await 관리계정조치(admin, 번호, 'sensitive');
    await test.step('POST /api/v1/admin/accounts/{id}/unsensitive 를 어드민 키로 부른다', async () => {
      const 응답 = await admin.post(`/api/v1/admin/accounts/${번호}/unsensitive`);
      await verify('POST /api/v1/admin/accounts/{id}/unsensitive 를 어드민 키로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    if (번호 !== '') await admin.post(`/api/v1/admin/accounts/${번호}/unsensitive`);
  }
});
