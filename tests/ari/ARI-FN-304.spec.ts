import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호찾기 } from './helpers/api.helper.js';
import { 가입제출, 일회용아이디 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-304',
  name: '비밀번호 확인 칸을 다르게 넣어 제출하면 302 로 가입된다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(302),
  }),
});

test(spec, async ({ request, admin, expected }) => {
  await test.step('비밀번호 확인 칸을 다르게 넣어 계정 만들기를 제출한다', async () => {
    const 아이디 = 일회용아이디();
    const 응답 = await 가입제출(request, { userName: 아이디, email: `${아이디}@example.invalid`, password: 'Qa123456x!', repeatPassword: 'Qa654321y!' });
    const 코드 = await verify('계정 만들기 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 계정 = await verify('확인 칸이 다른 계정이 만들어졌다', (await 계정번호찾기(admin, 아이디)) > 0, true);
    await verify('비밀번호 확인 칸을 다르게 넣어 제출하면 302 로 가입된다', 코드 && 계정, true);
  });
});
