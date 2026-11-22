import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 상점에서사기, 알림글읽기, 알림이모두사라질때까지 } from './helpers/items.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-176',
  name: '장착하면 「장착」으로 끝나는 알림이 「녹슨 단검」 이름과 함께 뜬다',
  platforms: ['windows'],
  smoke: true,
  precondition: ['일반 회원 가방에 「녹슨 단검」이 있다'],
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

  await test.step('가방에 「녹슨 단검」이 있는 것을 확인한다', async () => {
    await 상점에서사기(game, ['녹슨 단검']);
    const 가방 = await 가방창.열기(game);
    await verify('가방에 「녹슨 단검」이 있다', await 가방.줄이생길때까지('녹슨 단검'), true, { blocker: true });
    await 가방.닫기();
    await 알림이모두사라질때까지(game);
  });

  await test.step('「녹슨 단검」 줄의 「장착」을 누른다', async () => {
    const 가방 = await 가방창.열기(game);
    await 가방.장착하기('녹슨 단검');
    const 글 = await 알림글읽기(game, '녹슨 단검');
    const 평문 = 글 === null ? '' : 색글떼기(글);
    const 이름 = await verify('알림에 「녹슨 단검」 이름이 들어 있다', 평문.includes('녹슨 단검'), true);
    const 끝 = await verify('알림이 「장착」으로 끝난다', 평문.endsWith('장착'), true);
    await verify('장착하면 「장착」으로 끝나는 알림이 「녹슨 단검」 이름과 함께 뜬다', 이름 && 끝, true);
    await 가방.닫기();
  });
});
