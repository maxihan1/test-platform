import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 알림띠 } from './components/toast.component.js';
import { 상점에서사기, 창열기 } from './helpers/dungeon.helper.js';
import { 창열려있나 } from './helpers/dungeon-wait.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-438',
  name: '상점에서 「조약돌」을 사 알림이 뜬 뒤 사라질 때까지 재면 알림은 3초 넘게 보인 뒤 3.5초 안팎(5.5초 안)에 사라진다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    넘게: z.number().describe('알림이 보인 시간의 하한(초)').default(3),
    안: z.number().describe('알림이 사라질 때까지 걸린 시간의 상한(초)').default(5.5),
  }),
});

test(spec, async ({ game, admin, params, expected }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  const 알림 = new 알림띠(game);
  await test.cleanup('일반 회원을 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('상점에서 「조약돌」을 사 알림이 뜬 뒤 사라질 때까지 잰다', async () => {
    await 창열기(game, '상점');
    await verify('상점 창이 열린다', await 창열려있나(game, '상점'), true, { blocker: true });
    const 시작 = Date.now();
    await 상점에서사기(game, '조약돌');
    const 알림줄 = await 알림.그글줄주소('');
    await verify('구매 알림이 뜬다', 알림줄 !== null, true, { blocker: true });
    const 글 = await game.text(알림줄 ?? '');
    const 사라졌다 = await 알림.사라질때까지(글, 15_000);
    const 걸린초 = (Date.now() - 시작) / 1000;
    const 보임 = await verify('알림이 3초를 넘게 보인다', 걸린초 > expected.넘게, true);
    const 안쪽 = await verify('알림이 5.5초 안에 사라진다', 사라졌다 && 걸린초 <= expected.안, true);
    await verify('상점에서 「조약돌」을 사 알림이 뜬 뒤 사라질 때까지 재면 알림은 3초 넘게 보인 뒤 3.5초 안팎(5.5초 안)에 사라진다', 보임 && 안쪽, true);
  });
});
