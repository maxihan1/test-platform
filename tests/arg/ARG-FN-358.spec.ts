import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-358',
  name: '상점 창을 열면 장신구 · 물약 줄 가격과 설명이 아이템 표의 「행운의 반지」 300 · 「골드 획득 +20%」, 「현자의 목걸이」 300 · 「경험치 획득 +20%」, 「체력 물약」 30 · 「체력 50% 회복 · 던전에서 사용」과 같다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['item:lucky_ring', 'item:sage_necklace', 'item:health_potion'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('상점 창의 장신구 · 물약 줄을 읽는다', async () => {
      const 상점 = await 상점창.열기(game);
      const 줄0 = await verify('「행운의 반지」 줄의 설명과 가격이 「골드 획득 +20% · 300 G」이다', [await 상점.줄칸글('행운의 반지', 1), await 상점.줄칸글('행운의 반지', 2)].join(' · '), '골드 획득 +20% · 300 G');
      const 줄1 = await verify('「현자의 목걸이」 줄의 설명과 가격이 「경험치 획득 +20% · 300 G」이다', [await 상점.줄칸글('현자의 목걸이', 1), await 상점.줄칸글('현자의 목걸이', 2)].join(' · '), '경험치 획득 +20% · 300 G');
      const 줄2 = await verify('「체력 물약」 줄의 설명과 가격이 「체력 50% 회복 · 던전에서 사용 · 30 G」이다', [await 상점.줄칸글('체력 물약', 1), await 상점.줄칸글('체력 물약', 2)].join(' · '), '체력 50% 회복 · 던전에서 사용 · 30 G');
      await verify('상점 창을 열면 장신구 · 물약 줄 가격과 설명이 아이템 표의 「행운의 반지」 300 · 「골드 획득 +20%」, 「현자의 목걸이」 300 · 「경험치 획득 +20%」, 「체력 물약」 30 · 「체력 50% 회복 · 던전에서 사용」과 같다', 줄0 && 줄1 && 줄2, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
