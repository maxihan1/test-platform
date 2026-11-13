import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 있는지 } from './helpers/find.helper.js';
import { 던전까지 } from './helpers/login.helper.js';
import { 던전 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-052',
  name: '던전 화면에 「임프」 이름표가 보이지 않는다',
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

  await test.step('던전 화면을 확인한다', async () => {
    const 화면 = await 던전.열기(game);
    await 화면.초상화가채워질때까지(params.loginId ?? '');
    await verify('던전 화면에 「임프」 이름표가 보이지 않는다', await 화면.임프이름표가있는지(), false);
  });
});
