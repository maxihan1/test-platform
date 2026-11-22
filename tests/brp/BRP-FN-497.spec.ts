import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 로비로되돌리기, 손님봇켜기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-497',
  name: '「준비!」를 누르면 버튼 글이 「준비 취소」로 바뀐다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다', '준비하지 않은 손님 봇이 로비에 있어 던전이 바로 열리지 않는다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  await test.cleanup('봇을 끄고 방을 로비로 돌리기', () => 로비로되돌리기(admin));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('준비하지 않은 손님 봇을 로비에 둔 것을 확인한다', async () => {
    const 봇 = await 손님봇켜기(admin, 'qaguest1');
    await verify('손님 봇이 켜졌다', 봇 !== '', true, { blocker: true });
  });

  await test.step('영웅 카드를 고르고 「준비!」를 누른다', async () => {
    const 로비 = await 로비화면.열림(game);
    await 로비.직업고르기('탱커');
    await 로비.준비누르기();
    await verify('「준비!」를 누르면 버튼 글이 「준비 취소」로 바뀐다', await 로비.준비글될때까지('준비 취소'), true);
  });
});
