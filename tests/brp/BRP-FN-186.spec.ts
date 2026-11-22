import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 알림띠 } from './components/toast.component.js';
import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM스탯, GM체력, 스탯숫자 } from './helpers/gm.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-186',
  name: '체력 물약을 쓰면 탱커 기본 체력 1,200 의 절반 600 을 회복해 체력이 700 이 된다',
  platforms: ['windows'],
  precondition: ['일반 회원이 탱커로 혼자 던전에 있고 체력을 100 으로 줄였다'],
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
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('일반 회원이 탱커로 던전에 들어와 체력이 100 인 것을 확인한다', async () => {
    await 던전입장(game, '탱커');
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
    await GM체력(game, 100);
    await verify('/gm stat 체력이 100 이다', 스탯숫자(await GM스탯(game), '체력'), 100, { blocker: true });
  });

  await test.step('「물약」 버튼을 누르고 /gm stat 체력을 읽는다', async () => {
    const 던전 = await 던전화면.열림(game);
    await 던전.hud.물약누르기();
    await new 알림띠(game).뜰때까지('체력 물약 사용');
    await verify('체력 물약을 쓰면 탱커 기본 체력 1,200 의 절반 600 을 회복해 체력이 700 이 된다', 스탯숫자(await GM스탯(game), '체력'), 700);
  });
});
