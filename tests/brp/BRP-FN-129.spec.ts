import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 초록인가 } from './helpers/dungeon.helper.js';
import { 갈래B머리위숫자 } from './helpers/dungeon-wait.helper.js';
import { 로그인하기, 던전입장 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM스탯, 스탯숫자, GM모두처치, GM체력 } from './helpers/gm.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-129',
  name: '던전에서 회복하면 머리 위에 초록색 「+」 숫자가 뜬다',
  platforms: ['windows'],
  precondition: ['일반 회원이 탱커로 혼자 던전에 있고 체력이 줄어 있다'],
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

  await test.step('일반 회원이 탱커로 던전에 들어온 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
    await 던전입장(game, '탱커');
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
  });
  await test.step('체력이 줄어 있는 것을 확인한다', async () => {
    await GM모두처치(game);
    await GM체력(game, 600);
    const 값 = await GM스탯(game);
    await verify('체력이 600 으로 줄어 있다', 스탯숫자(값, '체력'), 600, { blocker: true });
  });
  await test.step('체력 물약을 쓴다', async () => {
    const 던전 = await 던전화면.열림(game);
    await 던전.hud.물약누르기();
    const 숫자 = await 갈래B머리위숫자(game, 던전화면.회복숫자);
    const 떴다 = await verify('머리 위에 숫자가 뜬다', 숫자.뜸, true);
    const 더하기 = await verify('그 숫자에 「+」가 들어 있다', 숫자.글.includes('+'), true);
    const 초록 = await verify('그 숫자가 초록색이다', 숫자.색 !== null && 초록인가(숫자.색), true);
    await verify('던전에서 회복하면 머리 위에 초록색 「+」 숫자가 뜬다', 떴다 && 더하기 && 초록, true);
  });
});
