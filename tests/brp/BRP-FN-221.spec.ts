import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 골드맞추기, 알림글읽기, 알림이모두사라질때까지 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-221',
  name: '골드가 모자라 구매가 거절되면 골드가 「10 G」 그대로다',
  platforms: ['windows'],
  precondition: ['일반 회원 골드가 10 이다'],
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
  await test.cleanup('일반 회원을 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('일반 회원 골드가 10 인 것을 확인한다', async () => {
    await verify('골드가 10 이다', await 골드맞추기(game, 10), true, { blocker: true });
  });

  await test.step('상점 「녹슨 단검」 줄의 「구매」를 누른다', async () => {
    const 상점 = await 상점창.열기(game);
    await 상점.구매하기('녹슨 단검');
    await 알림글읽기(game, '골드가 부족합니다');
    await 상점.닫기();
    await verify('골드가 모자라 구매가 거절되면 골드가 「10 G」 그대로다', await new 공통HUD(game).골드글(), '10 G');
  });

  await test.step('상점 「녹슨 단검」 줄의 「구매」를 누르고 가방 창을 연다', async () => {
    await 알림이모두사라질때까지(game);
    const 상점 = await 상점창.열기(game);
    await 상점.구매하기('녹슨 단검');
    await 알림글읽기(game, '골드가 부족합니다');
    await 상점.닫기();
    const 가방 = await 가방창.열기(game);
    const 줄수 = await 가방.줄수('녹슨 단검');
    await 가방.닫기();
    await verify('골드가 모자라 구매가 거절된 뒤 가방에 「녹슨 단검」이 생기지 않는다', 줄수, 0);
  });
});
