import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방능력줄, 창열려있나 } from './helpers/dungeon-wait.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { GM골드 } from './helpers/gm.helper.js';
import { 우편으로아이템받기 } from './helpers/items.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-434',
  name: '창이 열린 채 골드가 바뀌면 가방 창 능력 줄 골드가 바로 777 로 다시 그려진다',
  platforms: ['windows'],
  held: '보류 — 가방 창이 채팅 띠를 덮어 가방 창을 연 채 채팅 창을 열 수 없다',
  precondition: ['일반 회원이 골드 767 에 게임에 없는 이름의 아이템 하나를 가방에 두고 로비에 있다'],
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

  const 이름 = 'QA 수상한 돌';
  let 가방: 가방창 | null = null;
  await test.step('골드를 767 로 맞추고 가방에 게임에 없는 이름의 아이템이 있는 것을 확인한다', async () => {
    await 우편으로아이템받기(game, admin, 아이디, 이름);
    await GM골드(game, 767);
    가방 = await 가방창.열기(game);
    await verify('가방에 게임에 없는 이름의 아이템 줄이 있다', await 가방.줄이생길때까지(이름), true, { blocker: true });
    await verify('가방 창 능력 줄 골드가 767 이다', (await 가방능력줄(game, '골드 767')).includes('골드 767'), true, { blocker: true });
  });

  await test.step('가방 창을 연 채 그 줄의 판매 버튼을 눌러 골드를 10 늘린다', async () => {
    await verify('가방 창이 열려 있다', 가방 !== null && (await 창열려있나(game, '가방')), true, { blocker: true });
    await 가방?.판매하기(이름);
    await verify('판 뒤에도 가방 창이 열려 있다', await 창열려있나(game, '가방'), true, { blocker: true });
    const 능력줄 = await 가방능력줄(game, '골드 777');
    await verify('창이 열린 채 골드가 바뀌면 가방 창 능력 줄 골드가 바로 777 로 다시 그려진다', 능력줄.includes('골드 777'), true);
  });
});
