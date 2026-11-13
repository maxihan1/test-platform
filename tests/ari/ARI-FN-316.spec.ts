import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 이동경로 } from './helpers/html.helper.js';
import { 웹로그인, 일회용회원만들기 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-316',
  name: '틀린 비밀번호로 여러 번 웹 로그인한 뒤 맞는 비밀번호로 로그인하면 302 로 /Account/Dashboard 로 이동한다',
  apiDoc: 2,
  precondition: ['케이스가 가입한 일회용 회원이 있다'],
  params: z.object({
    틀리는횟수: z.number().int().min(1).max(20).describe('맞는 비밀번호 앞에 틀리게 보낼 횟수 — 1~20').default(5),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(302),
  }),
  techniques: ['상태 전이'],
});

test(spec, async ({ request, params, expected }) => {
  await test.step('틀린 비밀번호로 여러 번 웹 로그인한 뒤 맞는 비밀번호로 POST /Account/Login 을 보낸다', async () => {
    const 회원 = await 일회용회원만들기(request);
    await verify('일회용 회원 가입 응답 코드가 302 다', 회원.가입상태, 302, { blocker: true });
    for (let i = 0; i < params.틀리는횟수; i += 1) await 웹로그인(request, 회원.아이디, `${회원.비밀번호}x`);
    const 응답 = await 웹로그인(request, 회원.아이디, 회원.비밀번호);
    const 코드 = await verify('맞는 비밀번호 웹 로그인 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 주소 = await verify('이동 주소가 「/Account/Dashboard」다', 이동경로(응답), '/Account/Dashboard');
    await verify('틀린 비밀번호로 여러 번 웹 로그인한 뒤 맞는 비밀번호로 로그인하면 302 로 /Account/Dashboard 로 이동한다', 코드 && 주소, true);
  });
});
