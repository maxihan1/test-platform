import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 상점에서사기, 알림글읽기 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-198',
  name: '상단 바와 상점 창 골드 글을 읽으면 상단 바 골드는 「 G」로 끝나게 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다', '일반 회원 가방에 「조약돌」이 있다'],
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

  await test.step('일반 회원 가방에 「조약돌」이 있는 것을 확인한다', async () => {
    await 상점에서사기(game, ['조약돌']);
    const 가방 = await 가방창.열기(game);
    await verify('가방에 「조약돌」 줄이 있다', await 가방.줄이생길때까지('조약돌'), true, { blocker: true });
    await 가방.닫기();
  });

  await test.step('상단 바와 상점 창 골드 글을 읽는다', async () => {
    const 상단글 = await new 공통HUD(game).골드글();
    const 상점 = await 상점창.열기(game);
    const 상점글 = 색글떼기(await 상점.보유골드글());
    await 상점.닫기();
    await verify('상단 바와 상점 창 골드 글을 읽으면 상단 바 골드는 「 G」로 끝나게 보인다', 상단글, '197 G');
    await verify('상점 창에 「보유 골드 197」이 보인다', 상점글, '보유 골드 197');
  });

  await test.step('「조약돌」을 팔고 알림을 읽는다', async () => {
    const 가방 = await 가방창.열기(game);
    await 가방.판매하기('조약돌');
    const 글 = await 알림글읽기(game, '판매 +');
    await 가방.닫기();
    await verify('판매 알림의 골드는 「골드」로 보인다', 글 !== null && 글.includes('골드'), true);
  });
});
