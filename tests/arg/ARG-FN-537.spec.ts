import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-537',
  name: '장착 중인 아이템 판매 요청을 보내면 장착 중인 아이템 판매 요청은 서버가 「장착 중인 아이템은 팔 수 없습니다」 오류로 거절한다',
  platforms: ['android'],
  precondition: ['무기 칸에 장비가 있다'],
  techniques: ['동등 분할', '상태 전이'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 화면에 그 버튼이 없어 서버에 요청을 보낼 길 없음',
});

test(spec, async ({ game, params }) => {
  await test.step('장착 중인 아이템 판매 요청을 보낸다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('장착 중인 아이템 판매 요청을 보내면 장착 중인 아이템 판매 요청은 서버가 「장착 중인 아이템은 팔 수 없습니다」 오류로 거절한다', await 뜨는지(game, 화면글자('장착 중인 아이템은 팔 수 없습니다')), true);
  });
});
