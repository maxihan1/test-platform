import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-037',
  name: '로그인하면 캐릭터를 불러와 상단 바에 「Lv.1」과 「200 G」가 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원이 로그인 화면에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('일반 회원을 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  const 화면 = await 로그인화면.열림(game);
  await test.step('로그인 화면이 뜬 것을 확인한다', async () => {
    await verify('로그인 화면에 「게임 시작」 버튼이 보인다', (await game.find(로그인화면.게임시작)) !== null, true, { blocker: true });
  });

  await test.step('일반 회원으로 로그인한다', async () => {
    await 화면.넣고시작(아이디, 비밀번호);
    await verify('로비 화면이 열린다', await 화면.로비뜰때까지(30_000), true, { blocker: true });
    const 로비 = await 로비화면.열림(game);
    await 로비.hud.그려질때까지();
    const 레벨 = await verify('상단 바 레벨이 「Lv.1」이다', /Lv\.1(?!\d)/.test(await 로비.hud.레벨이름()), true);
    const 골드 = await verify('상단 바 골드가 「200 G」다', await 로비.hud.골드글(), '200 G');
    await verify('로그인하면 캐릭터를 불러와 상단 바에 「Lv.1」과 「200 G」가 보인다', 레벨 && 골드, true);
  });
});
