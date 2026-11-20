import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면준비, 칸에서키치기 } from './helpers/login-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-596',
  name: '비밀번호 칸에서 엔터를 치면 「게임 시작」을 누른 것처럼 로비가 보인다',
  platforms: ['android'],
  held: '보류 — 엔터 키를 보낼 길 없음',
  precondition: ['로그인 화면이 떠 있다'],
  elements: ['zone:CharSelect'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    엔터키: z.string().describe('엔터로 보낼 키 이름 — Unity KeyCode 이름'),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  await test.cleanup('켜 둔 봇 끄기', () => 봇모두끄기(admin));
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.step('로그인 화면을 연다', async () => {
    await 로그인화면준비(game, driver);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('비밀번호 칸에서 엔터를 친다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 화면.아이디넣기(나.아이디);
    await 화면.비밀번호넣기(나.비밀번호);
    await 칸에서키치기(game, 로그인화면.비밀번호칸, params.엔터키);
    const 로비 = await 로비화면.열기(game).then(
      () => true,
      () => false,
    );
    await verify('비밀번호 칸에서 엔터를 치면 「게임 시작」을 누른 것처럼 로비가 보인다', 로비, true);
  });
});
