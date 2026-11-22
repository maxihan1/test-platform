import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 창열기 } from './helpers/dungeon.helper.js';
import { 가방능력줄, 창열려있나 } from './helpers/dungeon-wait.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { GM골드 } from './helpers/gm.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-434',
  name: '창이 열린 채 골드가 바뀌면 가방 창 능력 줄 골드가 바로 777 로 다시 그려진다',
  platforms: ['windows'],
  held: '보류 — 가방 창이 채팅 띠를 덮어 가방 창을 연 채 채팅 창을 열 수 없다',
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
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

  await test.step('가방 창을 연 채 /gm gold 777 로 골드를 바꾼다', async () => {
    await 창열기(game, '가방');
    await verify('가방 창이 열린다', await 창열려있나(game, '가방'), true, { blocker: true });
    await GM골드(game, 777);
    await verify('골드를 바꾼 뒤에도 가방 창이 열려 있다', await 창열려있나(game, '가방'), true, { blocker: true });
    const 능력줄 = await 가방능력줄(game, '골드 777');
    await verify('창이 열린 채 골드가 바뀌면 가방 창 능력 줄 골드가 바로 777 로 다시 그려진다', 능력줄.includes('골드 777'), true);
  });
});
