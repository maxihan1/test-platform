import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임로그인 } from './helpers/api.helper.js';
import { 일회용회원만들기 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-064',
  name: '빈 아이디로 POST /api/login 을 부르면 401 이다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다', '케이스가 가입한 일회용 회원이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(401),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  await test.step('빈 아이디로 POST /api/login 을 부른다', async () => {
    const 응답 = await 게임로그인(request, '', 'qa-any-password');
    await verify('빈 아이디로 POST /api/login 을 부르면 401 이다', 응답.status(), expected.응답코드);
  });
  await test.step('일회용 회원 아이디와 빈 비밀번호로 POST /api/login 을 부른다', async () => {
    const 회원 = await 일회용회원만들기(request);
    await verify('일회용 회원 가입 응답 코드가 302 다', 회원.가입상태, 302, { blocker: true });
    const 응답 = await 게임로그인(request, 회원.아이디, '');
    await verify('비밀번호가 빈 문자열일 때도 POST /api/login 은 401 이다', 응답.status(), expected.응답코드);
  });
});
