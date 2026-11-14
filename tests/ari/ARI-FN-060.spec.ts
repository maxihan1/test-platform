import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임로그인, 본문글 } from './helpers/api.helper.js';
import { 일회용회원만들기 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-060',
  name: '틀린 비밀번호로 POST /api/login 을 부르면 401 이고 본문이 비어 있다',
  apiDoc: 2,
  precondition: ['케이스가 가입한 일회용 회원이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(401),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  await test.step('일회용 회원 아이디와 틀린 비밀번호로 POST /api/login 을 부른다', async () => {
    const 회원 = await 일회용회원만들기(request);
    await verify('일회용 회원 가입 응답 코드가 302 다', 회원.가입상태, 302, { blocker: true });
    const 응답 = await 게임로그인(request, 회원.아이디, `${회원.비밀번호}x`);
    const 코드 = await verify('틀린 비밀번호 로그인 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('틀린 비밀번호 로그인 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('틀린 비밀번호로 POST /api/login 을 부르면 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
});
