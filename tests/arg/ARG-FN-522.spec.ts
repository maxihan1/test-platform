import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-522',
  name: '물약 · 전리품 · 알 수 없는 아이템을 장착하려 하면 「장착할 수 없는 아이템입니다」 오류 알림이 뜬다',
  platforms: ['android'],
  precondition: ['가방에 「체력 물약」이 있다'],
  techniques: ['동등 분할', '상태 전이'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 화면에 그 버튼이 없어 서버에 요청을 보낼 길 없음',
});

test(spec, async ({ game, params }) => {
  await test.step('「체력 물약」 장착 요청을 보낸다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('물약 · 전리품 · 알 수 없는 아이템을 장착하려 하면 「장착할 수 없는 아이템입니다」 오류 알림이 뜬다', await 뜨는지(game, 화면글자('장착할 수 없는 아이템입니다')), true);
  });
});
