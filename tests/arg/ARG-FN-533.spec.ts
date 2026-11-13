import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-533',
  name: '상점에 없는 아이템을 요청하면 「상점에서 팔지 않는 아이템입니다」 오류 알림이 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 화면에 그 버튼이 없어 서버에 요청을 보낼 길 없음',
});

test(spec, async ({ game, params }) => {
  await test.step('상점에 없는 아이템 구매 요청을 보낸다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('상점에 없는 아이템을 요청하면 「상점에서 팔지 않는 아이템입니다」 오류 알림이 뜬다', await 뜨는지(game, 화면글자('상점에서 팔지 않는 아이템입니다')), true);
  });
});
