import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상점에서사기, 창열기, 화면자리읽기 } from './helpers/dungeon.helper.js';
import { 창열려있나 } from './helpers/dungeon-wait.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 알림띠 } from './components/toast.component.js';

export const spec = defineCase({
  tcId: 'BRP-FN-437',
  name: '상점에서 「조약돌」을 사 알림을 띄우면 알림은 화면 위쪽 가운데에 한 줄로 뜬다',
  platforms: ['windows'],
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

  await test.step('상점에서 「조약돌」을 사 알림을 띄운다', async () => {
    await 창열기(game, '상점');
    await verify('상점 창이 열린다', await 창열려있나(game, '상점'), true, { blocker: true });
    await 상점에서사기(game, '조약돌');
    const 알림줄 = await new 알림띠(game).그글줄주소('');
    await verify('구매 알림이 뜬다', 알림줄 !== null, true, { blocker: true });
    const 주소 = 알림줄 ?? '';
    const 자리 = await 화면자리읽기(game, 주소);
    const 가운데 = await verify('알림이 화면 가운데에 있다', Math.abs(자리.가로 - 0.5) < 0.1, true);
    const 위쪽 = await verify('알림이 화면 위쪽에 있다', 자리.세로 < 0.3, true);
    const 한줄 = await verify('알림 글이 한 줄이다', (await game.text(주소)).includes('\n'), false);
    await verify('상점에서 「조약돌」을 사 알림을 띄우면 알림은 화면 위쪽 가운데에 한 줄로 뜬다', 가운데 && 위쪽 && 한줄, true);
  });
});
