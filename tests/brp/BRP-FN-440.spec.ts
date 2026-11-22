import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상점에서사기, 알림줄ID기다리기, 창열기 } from './helpers/dungeon.helper.js';
import { 창열려있나 } from './helpers/dungeon-wait.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-440',
  name: '알림 4개가 한꺼번에 뜨면 4개가 다 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  techniques: ['경계값 분석'],
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

  await test.step('상점에서 「조약돌」을 빠르게 네 번 산다', async () => {
    await 창열기(game, '상점');
    await verify('상점 창이 열린다', await 창열려있나(game, '상점'), true, { blocker: true });
    await 상점에서사기(game, '조약돌', 4);
    const 알림들 = await 알림줄ID기다리기(game, (ID들) => ID들.length >= 4, 5_000);
    await verify('알림 4개가 한꺼번에 뜨면 4개가 다 보인다', 알림들.length, 4);
  });

  await test.step('상점에서 「조약돌」을 빠르게 다섯 번 산다', async () => {
    await 알림줄ID기다리기(game, (ID들) => ID들.length === 0, 10_000);
    await 상점에서사기(game, '조약돌', 4);
    const 넷 = await 알림줄ID기다리기(game, (ID들) => ID들.length >= 4, 5_000);
    await verify('알림 네 개가 먼저 떠 있다', 넷.length, 4, { blocker: true });
    await 상점에서사기(game, '조약돌');
    const 첫알림 = 넷[0] ?? '';
    const 뒤 = await 알림줄ID기다리기(game, (ID들) => !ID들.includes(첫알림), 3_000);
    const 남은수 = await verify('알림은 4개만 남는다', 뒤.length, 4);
    const 지워짐 = await verify('가장 먼저 뜬 알림이 지워진다', 뒤.includes(첫알림), false);
    await verify('알림이 5개 뜬 뒤 4개만 남고 가장 먼저 뜬 알림이 지워진다', 남은수 && 지워짐, true);
  });
});
