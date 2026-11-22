import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 캐릭터값기다리기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-590',
  name: '상점에서 구매한 뒤 게임을 끄고 다시 켜 로그인하면 산 아이템과 줄어든 골드가 남아 있다',
  platforms: ['windows'],
  precondition: ['일반 회원 골드가 200 이다'],
  techniques: ['오류 추정'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('일반 회원을 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('일반 회원 골드가 200 인 것을 확인한다', async () => {
    await verify('골드가 200 이다', await new 공통HUD(game).골드(), 200, { blocker: true });
  });

  await test.step('상점에서 「녹슨 단검」을 사고 게임을 껐다 켜 다시 로그인한다', async () => {
    const 상점 = await 상점창.열기(game);
    await 상점.구매하기('녹슨 단검');
    await 상점.닫기();
    await 캐릭터값기다리기(admin, 아이디, (값) => (값.items['녹슨 단검'] ?? 0) === 1);
    await game.restart();
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('다시 로그인해 로비 화면이 열린다', 로비 !== null, true, { blocker: true });
    const 가방 = await 가방창.열기(game);
    const 줄 = await 가방.줄찾기('녹슨 단검');
    await 가방.닫기();
    const 아이템 = await verify('가방에 산 「녹슨 단검」이 남아 있다', 줄 !== null, true);
    const 골드 = await verify('골드가 「120 G」로 줄어든 채 남아 있다', await new 공통HUD(game).골드글(), '120 G');
    await verify('상점에서 구매한 뒤 게임을 끄고 다시 켜 로그인하면 산 아이템과 줄어든 골드가 남아 있다', 아이템 && 골드, true);
  });
});
