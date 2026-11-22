import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-173',
  name: '가방이 비었으면 가방 창에 「가방이 비어 있습니다」가 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원 가방의 아이템을 모두 팔아 비웠다'],
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

  await test.step('가방의 아이템을 모두 팔아 비운 것을 확인한다', async () => {
    const 가방 = await 가방창.열기(game);
    await 가방.모두팔기();
    await verify('가방에 아이템 줄이 없다', (await 가방.줄들()).length, 0, { blocker: true });
    await 가방.닫기();
  });

  await test.step('가방 창을 연다', async () => {
    const 가방 = await 가방창.열기(game);
    await verify('가방이 비었으면 가방 창에 「가방이 비어 있습니다」가 보인다', await 가방.비었다는글있나(), true);
    await 가방.닫기();
  });
});
