import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 상점에서사기 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-588',
  name: '「조약돌」 줄의 판매 버튼을 빠르게 두 번 누르면 가방 창에서 「판매」를 빠르게 두 번 눌러도 한 개만 팔려 골드가 1 만 는다',
  platforms: ['windows'],
  precondition: ['일반 회원 가방에 「조약돌」이 하나 있다'],
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

  await test.step('일반 회원 가방에 「조약돌」이 하나 있는 것을 확인한다', async () => {
    await 상점에서사기(game, ['조약돌']);
    const 가방 = await 가방창.열기(game);
    await 가방.줄이생길때까지('조약돌');
    await verify('가방에 「조약돌」이 하나 있다', (await 가방.줄찾기('조약돌'))?.개수 ?? 0, 1, { blocker: true });
    await 가방.닫기();
  });

  await test.step('「조약돌」 줄의 판매 버튼을 빠르게 두 번 누른다', async () => {
    const 상단 = new 공통HUD(game);
    const 전 = await 상단.골드();
    const 가방 = await 가방창.열기(game);
    await 가방.판매하기('조약돌', 2);
    await 가방.줄이사라질때까지('조약돌');
    await 가방.닫기();
    await 상단.골드가될때까지(전 + 1);
    await verify('「조약돌」 줄의 판매 버튼을 빠르게 두 번 누르면 가방 창에서 「판매」를 빠르게 두 번 눌러도 한 개만 팔려 골드가 1 만 는다', (await 상단.골드()) - 전, 1);
  });
});
