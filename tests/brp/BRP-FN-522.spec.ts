import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방개수읽기 } from './helpers/items.helper.js';
import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM스탯, GM체력, 스탯숫자 } from './helpers/gm.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-522',
  name: '묶음 줄의 「사용」을 누르면 그 묶음 가운데 1개만 써 「x2」가 된다',
  platforms: ['windows'],
  precondition: ['일반 회원이 탱커로 혼자 던전에 있고 체력이 줄었고 체력 물약이 3개다'],
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

  await test.step('일반 회원이 탱커로 던전에 들어와 체력이 줄고 체력 물약이 3개인 것을 확인한다', async () => {
    await 던전입장(game, '탱커');
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
    await GM체력(game, 100);
    await verify('체력이 최대 체력보다 낮다', 스탯숫자(await GM스탯(game), '체력') < 1200, true, { blocker: true });
    await verify('가방에 체력 물약이 3개 있다', await 가방개수읽기(game, '체력 물약'), 3, { blocker: true });
  });

  await test.step('가방 창 체력 물약 묶음 줄의 「사용」을 누른다', async () => {
    const 가방 = await 가방창.열기(game);
    await 가방.사용하기('체력 물약');
    await 가방.개수가될때까지('체력 물약', 2);
    const 개수 = (await 가방.줄찾기('체력 물약'))?.개수 ?? 0;
    await 가방.닫기();
    await verify('묶음 줄의 「사용」을 누르면 그 묶음 가운데 1개만 써 「x2」가 된다', 개수, 2);
  });
});
