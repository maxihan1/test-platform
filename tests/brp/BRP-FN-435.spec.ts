import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상점에서사기 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-435',
  name: '가방 창에서 「장착」을 누르면 창이 바로 다시 그려져 무기 칸에 「녹슨 단검」이 보인다',
  platforms: ['windows'],
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

  await test.step('일반 회원 가방에 「녹슨 단검」이 있는 것을 확인한다', async () => {
    await 상점에서사기(game, ['녹슨 단검']);
    const 가방 = await 가방창.열기(game);
    await verify('가방에 「녹슨 단검」 줄이 있다', await 가방.줄이생길때까지('녹슨 단검'), true, { blocker: true });
    await 가방.닫기();
  });

  await test.step('가방 창에서 「녹슨 단검」 줄의 「장착」을 누른다', async () => {
    const 가방 = await 가방창.열기(game);
    await 가방.장착하기('녹슨 단검');
    const 바뀜 = await 가방.칸이될때까지('무기', '녹슨 단검');
    await 가방.닫기();
    await verify('가방 창에서 「장착」을 누르면 창이 바로 다시 그려져 무기 칸에 「녹슨 단검」이 보인다', 바뀜, true);
  });
});
