import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리계정번호 } from './helpers/account.helper.js';
import { 없는번호 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-590',
  name: '없는 계정을 조회하면 응답 코드가 404 다',
  apiDoc: 1,
  precondition: ['토큰이 없다', '어드민 키가 있다', '승인 대기 계정 newbie_wait 가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(404),
    승인대기응답코드: z.number().describe('승인 대기 계정의 응답 코드').default(404),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, admin, expected }) => {
  const 대기번호 = await 관리계정번호(admin, 'newbie_wait');
  await test.step('승인 대기 계정을 확인한다', async () => {
    await verify('승인 대기 계정 newbie_wait 가 있다', 대기번호 !== '', true, { blocker: true });
  });
  await test.step('GET /api/v1/accounts/999999999 로 없는 계정을 부른다', async () => {
    const 응답 = await request.get(`/api/v1/accounts/${없는번호}`);
    await verify('없는 계정을 조회하면 응답 코드가 404 다', 응답.status(), expected.응답코드);
  });
  await test.step('승인 대기 계정 newbie_wait 를 GET /api/v1/accounts/{id} 로 부른다', async () => {
    const 응답 = await request.get(`/api/v1/accounts/${대기번호}`);
    await verify('승인 대기 계정 조회의 응답 코드가 404 다', 응답.status(), expected.승인대기응답코드);
  });
});
