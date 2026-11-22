import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 갈래B값될때까지, 갈래B임프퀘스트읽기 } from './helpers/dungeon-wait.helper.js';
import { 로그인하기, 던전입장 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM모두처치, GM던지는임프불러내기, GM퀘스트리셋 } from './helpers/gm.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-009',
  name: '던지는 임프를 잡으면 「임프 30마리 처치」 퀘스트 진행이 1 오른다',
  platforms: ['windows'],
  precondition: ['일반 회원이 탱커로 혼자 던전에 들어와 있다'],
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
  await test.step('오늘 퀘스트를 처음으로 돌리고 /gm spawn thrower 로 던지는 임프를 불러 잡는다', async () => {
    const 던전 = await 던전화면.열림(game);
    await GM모두처치(game);
    await GM퀘스트리셋(game);
    const 전 = await 갈래B임프퀘스트읽기(game, () => 던전.hud.메뉴누르기('퀘스트'));
    await verify('첫 줄이 「임프 30마리 처치」 퀘스트다', 전.이름, '임프 30마리 처치', { blocker: true });
    await GM던지는임프불러내기(game);
    await GM모두처치(game);
    const 후 = await 갈래B값될때까지(() => 갈래B임프퀘스트읽기(game, () => 던전.hud.메뉴누르기('퀘스트')), (값) => 값.진행 > 전.진행, 15_000);
    await verify('던지는 임프를 잡으면 「임프 30마리 처치」 퀘스트 진행이 1 오른다', 후.진행 - 전.진행, 1);
  });
});
