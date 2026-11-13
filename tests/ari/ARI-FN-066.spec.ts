import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임로그인 } from './helpers/api.helper.js';
import { 일회용회원만들기 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-066',
  name: '틀린 비밀번호로 여러 번 부른 뒤 맞는 비밀번호로 POST /api/login 을 부르면 200 이다',
  apiDoc: 2,
  precondition: ['케이스가 가입한 일회용 회원이 있다'],
  params: z.object({
    틀리는횟수: z.number().int().min(1).max(20).describe('맞는 비밀번호 앞에 틀리게 부를 횟수 — 1~20').default(5),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
  techniques: ['상태 전이'],
});

test(spec, async ({ request, params, expected }) => {
  await test.step('틀린 비밀번호로 여러 번 부른 뒤 맞는 비밀번호로 POST /api/login 을 부른다', async () => {
    const 회원 = await 일회용회원만들기(request);
    await verify('일회용 회원 가입 응답 코드가 302 다', 회원.가입상태, 302, { blocker: true });
    for (let i = 0; i < params.틀리는횟수; i += 1) await 게임로그인(request, 회원.아이디, `${회원.비밀번호}x`);
    const 응답 = await 게임로그인(request, 회원.아이디, 회원.비밀번호);
    await verify('틀린 비밀번호로 여러 번 부른 뒤 맞는 비밀번호로 POST /api/login 을 부르면 200 이다', 응답.status(), expected.응답코드);
  });
});
