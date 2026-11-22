import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { GM경험치바로, 큰글기다리기 } from './helpers/dungeon.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-443',
  name: '/gm exp 100 으로 레벨을 올려 큰 알림이 뜬 뒤 사라질 때까지 재면 큰 알림 「레벨 업!」은 뜬 뒤 2.2초 안팎(4초 안)에 사라진다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  elements: ['level:2'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    안: z.number().describe('큰 알림이 사라질 때까지 걸린 시간의 상한(초)').default(4),
  }),
});

test(spec, async ({ game, admin, params, expected }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('일반 회원을 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('/gm exp 100 으로 레벨을 올려 큰 알림이 뜬 뒤 사라질 때까지 잰다', async () => {
    await GM경험치바로(game, 100);
    const 떴다 = await 큰글기다리기(game, '레벨 업!', true, 15_000);
    await verify('큰 알림 「레벨 업!」이 뜬다', 떴다, true, { blocker: true });
    const 시작 = Date.now();
    const 사라졌다 = await 큰글기다리기(game, '레벨 업!', false, 10_000);
    const 걸린초 = (Date.now() - 시작) / 1000;
    const 사라짐 = await verify('큰 알림 「레벨 업!」이 사라진다', 사라졌다, true);
    const 안쪽 = await verify('큰 알림이 4초 안에 사라진다', 걸린초 <= expected.안, true);
    await verify('/gm exp 100 으로 레벨을 올려 큰 알림이 뜬 뒤 사라질 때까지 재면 큰 알림 「레벨 업!」은 뜬 뒤 2.2초 안팎(4초 안)에 사라진다', 사라짐 && 안쪽, true);
  });
});
