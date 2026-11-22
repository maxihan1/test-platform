import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD, type 메뉴이름 } from './components/hud.component.js';
import { type 화면자리, 화면자리읽기 } from './helpers/dungeon.helper.js';
import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { 로비로되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-507',
  name: '로비 메뉴 자리를 읽으면 로비에서 메뉴는 화면 왼쪽에 세로 줄로 있다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다', '일반 회원이 탱커로 혼자 던전에 들어와 있다'],
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

  const 차례: 메뉴이름[] = ['가방', '상점', '퀘스트', '우편', '친구', '길드'];
  let 로비버튼높이 = 0;
  await test.step('로비 메뉴 자리를 읽는다', async () => {
    const 로비 = await 로비화면.열림(game);
    const 자리들: 화면자리[] = [];
    for (const 이름 of 차례) 자리들.push(await 화면자리읽기(game, 로비.hud.메뉴버튼(이름)));
    로비버튼높이 = 자리들[0]?.높이 ?? 0;
    const 왼쪽 = await verify('로비 메뉴가 화면 왼쪽에 있다', 자리들.every((자리) => 자리.가로 < 0.5), true);
    const 가로 = 자리들.map((자리) => 자리.가로);
    const 세로줄 = await verify('로비 메뉴가 세로 한 줄로 놓여 있다', Math.max(...가로) - Math.min(...가로) < 0.02, true);
    await verify('로비 메뉴 자리를 읽으면 로비에서 메뉴는 화면 왼쪽에 세로 줄로 있다', 왼쪽 && 세로줄, true);
  });

  await test.step('일반 회원이 탱커로 던전에 들어온 것을 확인한다', async () => {
    await 던전입장(game, '탱커');
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
  });

  await test.step('던전 메뉴 자리를 읽는다', async () => {
    const 던전 = await 던전화면.열림(game);
    const 자리 = await 화면자리읽기(game, 공통HUD.메뉴);
    const 버튼 = await 화면자리읽기(game, 던전.hud.메뉴버튼('가방'));
    const 오른쪽 = await verify('던전 메뉴가 화면 오른쪽에 있다', 자리.가로 > 0.5, true);
    const 가운데 = await verify('던전 메뉴가 화면 세로 가운데에 있다', 자리.세로 > 0.25 && 자리.세로 < 0.75, true);
    const 작다 = await verify('던전 메뉴 버튼이 로비 메뉴 버튼보다 작다', 버튼.높이 < 로비버튼높이, true);
    await verify('던전에서 메뉴는 화면 오른쪽 가운데에 로비보다 작게 있다', 오른쪽 && 가운데 && 작다, true);
  });
});
