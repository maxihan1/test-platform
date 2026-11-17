import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 둘이서던전으로, 쓰러진아군을골라부활누르기 } from './helpers/battle.helper.js';
import { 계정되돌리기, 봇끄기, 봇시키기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-099',
  name: '다른 플레이어가 쓰러지면 알림 줄에 「<이름> 님이 쓰러졌습니다!」가 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원과 두 번째 플레이어 봇이 함께 던전에 있다', '일반 회원과 두 번째 플레이어 봇이 함께 던전에 있고 봇이 쓰러져 있다'],
  elements: ['zone:Dungeon', 'move:생존 살아 있음→쓰러짐', 'move:생존 쓰러짐→살아 있음'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    secondPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 둘째 = { 아이디: params.secondId ?? '', 비밀번호: params.secondPassword ?? '' };
  try {
    let 봇 = '';
    await test.step('두 계정을 처음 상태로 되돌리고 봇과 함께 던전에 들어간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 계정되돌리기(admin, 둘째.아이디, 둘째.비밀번호, 'base');
      봇 = (await 둘이서던전으로(game, admin, { 아이디, 비밀번호 }, 둘째, 0)).봇;
    });
    await test.step('던전에 들어왔는지 확인한다', async () => {
      await verify('던전에 「공격」 버튼이 보인다', await 던전화면.지금(game).보이나(던전화면.공격), true, { blocker: true });
    });

    await test.step('봇을 GM 명령으로 쓰러뜨린다', async () => {
      await 봇시키기(admin, 봇, 'gm:faint');
      await verify('다른 플레이어가 쓰러지면 알림 줄에 「<이름> 님이 쓰러졌습니다!」가 뜬다', await 던전화면.지금(game).hud.알림기다리기(`${둘째.아이디} 님이 쓰러졌습니다!`, 15_000), true);
    });

    await test.step('쓰러진 봇을 「부활」로 일으킨다', async () => {
      await 쓰러진아군을골라부활누르기(game);
      await verify('「<이름> 님이 부활했습니다!」가 뜬다', await 던전화면.지금(game).hud.알림기다리기(`${둘째.아이디} 님이 부활했습니다!`, 15_000), true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째.아이디, 둘째.비밀번호, 'base');
  }
});
