import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇과함께던전입장, 그림들 } from './helpers/dungeon.helper.js';
import { 갈래B뜰때까지 } from './helpers/dungeon-wait.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기, 봇시키기 } from './helpers/game-state.helper.js';
import { GM모두처치 } from './helpers/gm.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-089',
  name: '다른 플레이어를 고르면 「공격」 버튼이 「부활」로 바뀐다',
  platforms: ['windows'],
  precondition: ['일반 회원과 두 번째 플레이어 봇이 함께 던전에 들어와 있다'],
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

  await test.step('일반 회원과 두 번째 플레이어 봇이 함께 던전에 들어온 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
    await 봇과함께던전입장(admin, game, 봇아이디, 봇비밀번호, '탱커');
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
    await verify('동료 초상화에 두 번째 플레이어가 보인다', await 갈래B뜰때까지(game, 던전화면.동료이름, 20_000), true, { blocker: true });
    await verify('동료 초상화 이름이 두 번째 플레이어다', await game.text(던전화면.동료이름), 봇아이디, { blocker: true });
  });
  await test.step('던전의 적을 모두 치운 것을 확인한다', async () => {
    await GM모두처치(game);
    const 던전 = await 던전화면.열림(game);
    await verify('던전에 임프가 하나도 없다', await 던전.임프사라질때까지(), true, { blocker: true });
  });
  await test.step('두 번째 플레이어 봇을 쓰러뜨리고 동료 초상화를 클릭해 고른다', async () => {
    const 던전 = await 던전화면.열림(game);
    await 봇시키기(admin, 봇아이디, 'gm:heal');
    await 봇시키기(admin, 봇아이디, 'gm:faint');
    await verify('두 번째 플레이어가 쓰러진 것이 알림 줄에 보인다', await 던전.알림줄기다리기('님이 쓰러졌습니다!'), true, { blocker: true });
    await 던전.동료초상화누르기();
    await verify('쓰러진 동료를 고른 상태가 된다', await 던전.버튼그림될때까지(0, 그림들.부활), true, { blocker: true });
    await verify('다른 플레이어를 고르면 「공격」 버튼이 「부활」로 바뀐다', await 던전.버튼글(0), '부활');
  });
});
