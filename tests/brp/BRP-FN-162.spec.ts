import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 알림띠 } from './components/toast.component.js';
import { 임프하나두기, 불러둔임프잡기 } from './helpers/dungeon.helper.js';
import { 갈래B값될때까지 } from './helpers/dungeon-wait.helper.js';
import { 로그인하기, 던전입장 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM레벨 } from './helpers/gm.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-162',
  name: '임프를 잡으면 따로 알림이 뜨지 않는다',
  platforms: ['windows'],
  precondition: ['일반 회원이 탱커로 혼자 던전에 들어와 적을 모두 치우고 임프 하나를 불러 두었다'],
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
  await test.step('적을 모두 치우고 임프 하나를 불러 둔 것을 확인한다', async () => {
    await 임프하나두기(game);
    const 던전 = await 던전화면.열림(game);
    await verify('불러낸 임프가 보인다', await 던전.임프있나(), true, { blocker: true });
  });
  await test.step('불러낸 임프를 잡는다', async () => {
    const 던전 = await 던전화면.열림(game);
    const 알림 = new 알림띠(game);
    await GM레벨(game, 1);
    const 전골드 = await 던전.hud.골드글();
    const 전경험 = await 던전.hud.경험치글();
    await verify('앞서 뜬 알림이 모두 사라진다', await 갈래B값될때까지(() => 알림.글들(), (글들) => 글들.length === 0, 15_000), [], { blocker: true });
    await verify('임프가 사라진다', await 불러둔임프잡기(던전), true, { blocker: true });
    const 골드 = await 갈래B값될때까지(() => 던전.hud.골드글(), (글) => 글 !== 전골드, 10_000);
    const 경험 = await 갈래B값될때까지(() => 던전.hud.경험치글(), (글) => 글 !== 전경험, 10_000);
    await verify('임프를 잡으면 따로 알림이 뜨지 않는다', await 알림.글들(), []);
    const 골드바뀜 = await verify('상단 바 골드 글이 바뀐다', 골드 !== 전골드, true);
    const 경험바뀜 = await verify('상단 바 경험치 글이 바뀐다', 경험 !== 전경험, true);
    await verify('임프를 잡은 뒤 상단 바의 골드와 경험치 글이 바뀐다', 골드바뀜 && 경험바뀜, true);
  });
});
