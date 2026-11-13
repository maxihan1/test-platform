import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-538',
  name: '우편함 창을 열면 우편은 운영툴의 「지급 · 회수」에서 보내고 우편 한 통에는 제목 · 보낸 사람 · 본문과 첨부(아이템 여러 개, 골드)가 들어 있다',
  platforms: ['android'],
  precondition: ['운영툴에서 첨부가 있는 우편을 보냈다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('우편함 창을 연다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('우편함 창을 열면 우편은 운영툴의 「지급 · 회수」에서 보내고 우편 한 통에는 제목 · 보낸 사람 · 본문과 첨부(아이템 여러 개, 골드)가 들어 있다', await 뜨는지(game, 화면글자('지급 · 회수')), true);
  });
});
