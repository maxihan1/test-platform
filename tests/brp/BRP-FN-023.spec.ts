import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 접속상태 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-023',
  name: '로그인하면 bossroom.maxihan.com 게임 서버의 시험 주소 접속 수가 1 이상이고 일반 회원 이름이 들어 있다',
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

  await test.step('로그인한 뒤 bossroom.maxihan.com 게임 서버의 접속 상태를 읽는다', async () => {
    await 화면.넣고시작(아이디, 비밀번호);
    await verify('로비 화면이 열린다', await 화면.로비뜰때까지(30_000), true, { blocker: true });
    const 상태 = await 접속상태(admin);
    const 수 = await verify('시험 주소 접속 수가 1 이상이다', 상태.clients >= 1, true);
    const 이름 = await verify('접속자 목록에 일반 회원 이름이 들어 있다', 상태.players.some((p) => p.name === 아이디), true);
    await verify('로그인하면 bossroom.maxihan.com 게임 서버의 시험 주소 접속 수가 1 이상이고 일반 회원 이름이 들어 있다', 수 && 이름, true);
  });
});
