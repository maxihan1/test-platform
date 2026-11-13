import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뜨는지, 있는지 } from './helpers/find.helper.js';
import { 던전까지, 열린창닫기 } from './helpers/login.helper.js';
import { 던전 } from './pages/dungeon.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-165',
  name: '던전에서 메뉴 「상점」을 누르면 상점 창이 열린다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 탱커로 던전에 들어가 있다'],
  elements: ['class:tank', 'zone:Dungeon'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  await test.step('일반 회원으로 탱커 던전에 들어간다', async () => {
    const 화면 = await 던전까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await 화면.안내창닫기();
    await verify('던전 행동 막대가 보인다', await 있는지(game, 던전.행동막대), true, { blocker: true });
  });

  await test.step('던전 메뉴의 「상점」을 누른다', async () => {
    const 화면 = await 던전.열기(game);
    try {
      await 화면.hud.메뉴누르기('상점');
      await verify('던전에서 메뉴 「상점」을 누르면 상점 창이 열린다', await 뜨는지(game, 상점창.제목, 15_000), true);
    } finally {
      await 열린창닫기(game);
    }
  });
});
