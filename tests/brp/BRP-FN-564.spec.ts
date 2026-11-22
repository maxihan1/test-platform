import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { 로비로되돌리기, 접속상태 } from './helpers/game-state.helper.js';
import { GM기절 } from './helpers/gm.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 로그인화면 } from './pages/login.page.js';
import { 결과화면 } from './pages/postgame.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-564',
  name: '결과 화면에서 「메인 메뉴로」를 누르면 접속이 끊기고 로그인 창이 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원이 결과 화면에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  await test.cleanup('방을 로비로 돌리기', () => 로비로되돌리기(admin));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('일반 회원이 탱커로 혼자 던전에 들어온 것을 확인한다', async () => {
    await 던전입장(game, '탱커');
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
  });

  await test.step('일반 회원이 결과 화면에 있는 것을 확인한다', async () => {
    await GM기절(game);
    await verify('결과 화면이 열린다', await 결과화면.뜰때까지(game, 30_000), true, { blocker: true });
  });

  await test.step('「메인 메뉴로」를 누른다', async () => {
    await (await 결과화면.열림(game)).메인메뉴로();
    const 로그인창 = await game.waitFor(로그인화면.게임시작, { timeoutMs: 20_000 }).then(
      () => true,
      () => false,
    );
    const 창 = await verify('로그인 창이 보인다', 로그인창, true);
    const 끊김 = await verify('서버 접속자 목록에 일반 회원이 없다', !(await 접속상태(admin)).players.some((p) => p.user === (params.userId ?? '')), true);
    await verify('결과 화면에서 「메인 메뉴로」를 누르면 접속이 끊기고 로그인 창이 보인다', 창 && 끊김, true);
  });
});
