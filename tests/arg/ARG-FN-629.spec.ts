import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-629',
  name: '누구나 「길드 탈퇴」를 누르면 확인 창 없이 탈퇴하고 남은 길드원에게 「<이름> 님이 길드를 떠났습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['길드에 들어가 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 골드를 다시 채우는 길 없음(운영 지급 API 경로가 가이드에 없어 길드 만들기 500 골드를 되풀이해 쓸 수 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('「길드 탈퇴」를 누른다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('누구나 「길드 탈퇴」를 누르면 확인 창 없이 탈퇴하고 남은 길드원에게 「<이름> 님이 길드를 떠났습니다」가 뜬다', await 뜨는지(game, 화면글자('길드 탈퇴')), true);
  });
});
