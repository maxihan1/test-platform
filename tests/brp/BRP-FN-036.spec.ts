import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로되돌리기, 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-036',
  name: '같은 계정이 이미 접속해 있을 때 로그인하면 「접속 실패」 창에 「같은 계정으로 이미 접속 중입니다. 다른 기기의 접속을 끊고 다시 시도해 주세요」가 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원 계정의 봇이 이미 접속해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('봇을 끄고 방을 로비로 돌리기', () => 로비로되돌리기(admin));

  const 화면 = await 로그인화면.열림(game);
  await test.step('일반 회원 계정의 봇을 접속시킨다', async () => {
    await 봇켜기(admin, 아이디, 비밀번호);
    await verify('일반 회원 계정의 봇이 접속해 있다', (await 접속상태(admin)).players.some((p) => p.user === 아이디 && p.bot), true, { blocker: true });
  });

  await test.step('일반 회원으로 「게임 시작」을 누른다', async () => {
    await 화면.넣고시작(아이디, 비밀번호);
    await verify('안내 창이 뜬다', await 화면.안내.뜰때까지(20_000), true, { blocker: true });
    const 제목 = await verify('안내 창 제목이 「접속 실패」다', await 화면.안내.제목(), '접속 실패');
    const 본문 = await verify('안내 창 본문에 「같은 계정으로 이미 접속 중입니다. 다른 기기의 접속을 끊고 다시 시도해 주세요」가 들어 있다', (await 화면.안내.본문()).includes('같은 계정으로 이미 접속 중입니다. 다른 기기의 접속을 끊고 다시 시도해 주세요'), true);
    await verify('같은 계정이 이미 접속해 있을 때 로그인하면 「접속 실패」 창에 「같은 계정으로 이미 접속 중입니다. 다른 기기의 접속을 끊고 다시 시도해 주세요」가 보인다', 제목 && 본문, true);
  });
});
