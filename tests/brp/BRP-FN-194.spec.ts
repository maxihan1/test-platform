import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { 알림글읽기, 알림이모두사라질때까지 } from './helpers/items.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-194',
  name: '물약이 없을 때 쓰면 오류 알림 「체력 물약이 없습니다」가 뜬다',
  platforms: ['windows'],
  precondition: ['일반 회원이 탱커로 혼자 던전에 있고 체력 물약을 모두 썼다'],
  techniques: ['동등 분할'],
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

  await test.step('일반 회원이 탱커로 던전에 들어와 체력 물약을 모두 쓴 것을 확인한다', async () => {
    await 던전입장(game, '탱커');
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
    const 던전 = await 던전화면.열림(game);
    await 던전.hud.물약누르기();
    await 던전.hud.물약누르기();
    await 던전.hud.물약누르기();
    const 가방 = await 가방창.열기(game);
    await 가방.줄이사라질때까지('체력 물약', 20_000);
    await verify('가방에 체력 물약이 없다', await 가방.줄수('체력 물약'), 0, { blocker: true });
    await 가방.닫기();
    await 알림이모두사라질때까지(game);
  });

  await test.step('「물약」 버튼을 누른다', async () => {
    const 던전 = await 던전화면.열림(game);
    await 던전.hud.물약누르기();
    const 글 = await 알림글읽기(game, '체력 물약이 없습니다');
    await verify('물약이 없을 때 쓰면 오류 알림 「체력 물약이 없습니다」가 뜬다', 글 !== null, true);
  });
});
