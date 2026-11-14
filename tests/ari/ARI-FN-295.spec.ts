import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 이동경로 } from './helpers/html.helper.js';
import { 가입제출, 일회용아이디 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-295',
  name: '신규 아이디로 계정 만들기를 제출하면 302 로 /Account/RegisterSuccess 로 이동한다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(302),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('신규 아이디 · 이메일 · 비밀번호로 계정 만들기를 제출한다', async () => {
    const 아이디 = 일회용아이디();
    const 응답 = await 가입제출(request, { userName: 아이디, email: `${아이디}@example.invalid`, password: 'Qa123456x!' });
    const 코드 = await verify('계정 만들기 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 주소 = await verify('이동 주소가 「/Account/RegisterSuccess」다', 이동경로(응답), '/Account/RegisterSuccess');
    await verify('신규 아이디로 계정 만들기를 제출하면 302 로 /Account/RegisterSuccess 로 이동한다', 코드 && 주소, true);
  });
});
