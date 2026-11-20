import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로그인화면준비 } from './helpers/login-tools.helper.js';
import { 내이름, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-011',
  name: '아이디 앞뒤에 공백을 붙여 「게임 시작」을 누르면 공백을 잘라 로그인돼 로비가 보인다',
  platforms: ['android'],
  precondition: ['로그인 화면이 떠 있다'],
  elements: ['state:접속=로그아웃', 'state:장소=로비'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('로그인 화면을 연다', async () => {
    await 로그인화면준비(game, driver);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('아이디 앞뒤에 공백을 붙여 넣고 「게임 시작」을 누른다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 화면.아이디넣기(` ${나.아이디} `);
    await 화면.비밀번호넣기(나.비밀번호);
    await 화면.시작누르기();
    const 로비 = await verify(
      '로비가 보인다',
      await 로비화면.열기(game).then(
        () => true,
        () => false,
      ),
      true,
    );
    if (로비) await new 공통HUD(game).그려질때까지();
    const 이름 = await verify('캐릭터 이름이 공백 없는 아이디와 같다', 로비 ? await 내이름(game) : null, 나.아이디);
    await verify('아이디 앞뒤에 공백을 붙여 「게임 시작」을 누르면 공백을 잘라 로그인돼 로비가 보인다', 로비 && 이름, true);
  });
});
