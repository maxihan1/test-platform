import { defineCase, test, verify } from '@platform/kit';
import { 뒤로보냈다오기 } from '@platform/kit/parts';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비복귀됨 } from './helpers/login-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-591',
  name: '로비에서 게임을 내렸다 올리면 접속이 이어져 로비 화면과 상단 바가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  techniques: ['오류 추정'],
  elements: ['state:장소=로비'],
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
  const hud = new 공통HUD(game);
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    const 보임 = await 로비화면.열기(game).then(
      () => true,
      () => false,
    );
    await verify('로비 화면이 보인다', 보임, true, { blocker: true });
  });
  await test.step('게임을 내렸다 30초 뒤 올린다', async () => {
    await 뒤로보냈다오기(driver, 30);
    const 로비 = await verify('다시 올린 뒤 로비 화면이 보인다', await 로비복귀됨(game), true);
    const 상단바 = await verify('다시 올린 뒤 상단 바가 보인다', await hud.그려질때까지().then(
      () => true,
      () => false,
    ), true);
    await verify('로비에서 게임을 내렸다 올리면 접속이 이어져 로비 화면과 상단 바가 보인다', 로비 && 상단바, true);
  });
});
