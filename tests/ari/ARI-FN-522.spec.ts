import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 큰제목들 } from './helpers/html.helper.js';
import { 본문글 } from './helpers/api.helper.js';
import { 웹로그인, 일회용회원만들기 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-522',
  name: '틀린 비밀번호로 웹 로그인하면 200 으로 로그인 화면이 다시 보인다',
  apiDoc: 2,
  precondition: ['케이스가 가입한 일회용 회원이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('일회용 회원 아이디와 틀린 비밀번호로 POST /Account/Login 을 보낸다', async () => {
    const 회원 = await 일회용회원만들기(request);
    await verify('일회용 회원 가입 응답 코드가 302 다', 회원.가입상태, 302, { blocker: true });
    const 응답 = await 웹로그인(request, 회원.아이디, `${회원.비밀번호}x`);
    const 코드 = await verify('틀린 비밀번호 웹 로그인 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 화면 = await verify('큰 제목 「Login」이 보인다', 큰제목들(await 본문글(응답)).includes('Login'), true);
    await verify('틀린 비밀번호로 웹 로그인하면 200 으로 로그인 화면이 다시 보인다', 코드 && 화면, true);
  });
});
