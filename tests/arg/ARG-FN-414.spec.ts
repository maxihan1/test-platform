import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-414',
  name: '상점 목록을 끌어 넘기면 마지막 상품 「체력 물약」의 「구매」가 화면 안에 들어온다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  elements: ['item:health_potion'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    마지막상품: z.string().describe('상점 목록의 마지막 상품').default('체력 물약'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('상점 창을 연다', async () => {
    const 상점 = await 상점창.열기(game);
    const 이름들 = await 상점.이름들();
    await verify('상점 목록 맨 끝에 「체력 물약」 줄이 보인다', 이름들[이름들.length - 1], expected.마지막상품, { blocker: true });
  });

  await test.step('상점 창 목록을 위로 끌어 넘긴다', async () => {
    const 상점 = await 상점창.열기(game);
    await 상점.위로끌기();
    await verify('상점 목록을 끌어 넘기면 마지막 상품 「체력 물약」의 「구매」가 화면 안에 들어온다', await 상점.구매버튼이화면안인지(expected.마지막상품), true);
  });
});
