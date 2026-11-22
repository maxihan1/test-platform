import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 접속상태 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-001',
  name: '일반 회원 계정으로 로그인하면 게임 서버 접속자 목록에 일반 회원이 사람(봇 아님)으로 들어 있다',
  platforms: ['windows'],
  precondition: ['일반 회원이 로그인 화면에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';

  const 화면 = await 로그인화면.열림(game);
  await test.step('로그인 화면이 뜬 것을 확인한다', async () => {
    await verify('로그인 화면에 「게임 시작」 버튼이 보인다', (await game.find(로그인화면.게임시작)) !== null, true, { blocker: true });
  });

  await test.step('일반 회원 계정으로 「게임 시작」을 누른다', async () => {
    await 화면.넣고시작(아이디, 비밀번호);
    await verify('로비 화면이 열린다', await 화면.로비뜰때까지(30_000), true, { blocker: true });
    const 내접속 = (await 접속상태(admin)).players.find((p) => p.user === 아이디);
    const 들어있다 = await verify('접속자 목록에 일반 회원이 들어 있다', 내접속 !== undefined, true);
    const 사람이다 = await verify('들어 있는 일반 회원이 봇이 아니다', 내접속?.bot === false, true);
    await verify('일반 회원 계정으로 로그인하면 게임 서버 접속자 목록에 일반 회원이 사람(봇 아님)으로 들어 있다', 들어있다 && 사람이다, true);
  });
});
