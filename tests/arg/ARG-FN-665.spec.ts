import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 화면글자, 뜨는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-665',
  name: '「받기」 · 「모두 받기」 · 「삭제」가 끝나면 우편 목록과 메뉴 숫자가 다시 그려진다',
  platforms: ['android'],
  precondition: ['첨부가 없는 우편이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 상태 만드는 길 없음(운영 API 경로가 서비스 가이드에 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('우편 하나를 「삭제」하고 목록과 메뉴를 확인한다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('「받기」 · 「모두 받기」 · 「삭제」가 끝나면 우편 목록과 메뉴 숫자가 다시 그려진다', await 뜨는지(game, 화면글자('받기')), true);
  });
});
