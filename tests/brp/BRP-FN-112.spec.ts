import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창 } from './components/popup.component.js';
import { 갈래B뜰때까지, 갈래B봇먼저던전열기 } from './helpers/dungeon-wait.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM스탯 } from './helpers/gm.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-112',
  name: '늦게 들어와 고른 영웅이 없으면 무작위 영웅이 정해져 /gm stat 직업이 네 직업 가운데 하나다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어 봇이 혼자 준비해 던전을 진행하고 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  const 봇아이디 = params.p2Id ?? '';
  const 봇비밀번호 = params.p2Password ?? '';
  await test.cleanup('방을 로비로 돌리고 두 계정을 기준 상태로 되돌리기', async () => {
    await 로비로되돌리기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 봇아이디, 봇비밀번호, 'base');
  });

  await test.step('두 번째 플레이어 봇이 혼자 준비해 던전을 진행하고 있는 것을 확인한다', async () => {
    await verify('던전이 열린다', await 갈래B봇먼저던전열기(admin, 봇아이디, 봇비밀번호), true, { blocker: true });
  });
  await test.step('영웅을 고르지 않은 일반 회원으로 로그인한다', async () => {
    const 화면 = await 로그인화면.열림(game);
    const 안내 = new 안내창(game);
    if (await 안내.보이나()) await 안내.확인누르기();
    await 화면.넣고시작(아이디, 비밀번호);
    await verify('던전 행동 막대가 보인다', await 갈래B뜰때까지(game, 던전화면.행동막대, 60_000), true, { blocker: true });
    const 던전 = await 던전화면.열림(game);
    await 던전.안내창닫기();
    const 값 = await GM스탯(game);
    await verify('늦게 들어와 고른 영웅이 없으면 무작위 영웅이 정해져 /gm stat 직업이 네 직업 가운데 하나다', ['탱커', '궁수', '마법사', '도적'].includes(값['직업'] ?? ''), true);
  });
});
