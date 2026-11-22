import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM기절, GM보스방가기, GM보스처치 } from './helpers/gm.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 결과화면 } from './pages/postgame.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-563',
  name: '한 번은 보스를 잡아 승리, 한 번은 쓰러져 패배 결과 화면을 열면 결과 화면 장면 조명 색이 승리와 패배에서 다르다',
  platforms: ['windows'],
  precondition: ['일반 회원이 탱커로 혼자 던전에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('방을 로비로 돌리고 일반 회원을 기준 상태로 되돌리기', async () => {
    await 로비로되돌리기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  });

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('일반 회원이 탱커로 혼자 던전에 들어온 것을 확인한다', async () => {
    await 던전입장(game, '탱커');
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
  });

  await test.step('한 번은 보스를 잡아 승리, 한 번은 쓰러져 패배 결과 화면을 연다', async () => {
    await GM보스방가기(game);
    await GM보스처치(game);
    const 승리화면 = await 결과화면.열림(game, 45_000);
    await verify('승리 결과 화면이 열린다', (await 승리화면.승리글읽기()) !== null, true, { blocker: true });
    const 승리색 = await 승리화면.조명색();
    await 승리화면.메인메뉴로();
    await verify('로비 화면이 다시 열린다', (await 로그인하기(game, 아이디, 비밀번호)) !== null, true, { blocker: true });
    await 던전입장(game, '탱커');
    await GM기절(game);
    const 패배화면 = await 결과화면.열림(game, 45_000);
    await verify('패배 결과 화면이 열린다', (await 패배화면.패배글읽기()) !== null, true, { blocker: true });
    const 패배색 = await 패배화면.조명색();
    await verify('한 번은 보스를 잡아 승리, 한 번은 쓰러져 패배 결과 화면을 열면 결과 화면 장면 조명 색이 승리와 패배에서 다르다', 승리색 !== 패배색, true);
  });
});
