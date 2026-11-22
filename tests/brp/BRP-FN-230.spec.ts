import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 글숫자들, 상점에서사기 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { GM골드 } from './helpers/gm.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-230',
  name: '「강철 롱소드」 줄의 판매 버튼을 읽고 누르면 「강철 롱소드」 판매가는 상점가 350 의 1/4 을 버린 87 골드다',
  platforms: ['windows'],
  precondition: ['일반 회원 가방에 「강철 롱소드」가 있다'],
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

  await test.step('일반 회원 가방에 「강철 롱소드」가 있는 것을 확인한다', async () => {
    await GM골드(game, 1000);
    await 상점에서사기(game, ['강철 롱소드']);
    const 가방 = await 가방창.열기(game);
    await verify('가방에 「강철 롱소드」 줄이 있다', await 가방.줄이생길때까지('강철 롱소드'), true, { blocker: true });
    await 가방.닫기();
  });

  await test.step('「강철 롱소드」 줄의 판매 버튼을 읽고 누른다', async () => {
    const 상단 = new 공통HUD(game);
    const 전 = await 상단.골드();
    const 가방 = await 가방창.열기(game);
    const 버튼글 = await 가방.판매하기('강철 롱소드');
    await 가방.줄이사라질때까지('강철 롱소드');
    await 가방.닫기();
    await 상단.골드가될때까지(전 + 87);
    const 읽은값 = await verify('판매 버튼의 판매가가 87 이다', 글숫자들(버튼글)[0], 87);
    const 얻은값 = await verify('골드가 87 늘어난다', (await 상단.골드()) - 전, 87);
    await verify('「강철 롱소드」 줄의 판매 버튼을 읽고 누르면 「강철 롱소드」 판매가는 상점가 350 의 1/4 을 버린 87 골드다', 읽은값 && 얻은값, true);
  });
});
