import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로그인화면준비, 시작시도 } from './helpers/login-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-037',
  name: '로그인이 통과하면 캐릭터를 불러와 상단 바에 「Lv. 」와 골드가 보인다',
  platforms: ['android'],
  precondition: ['로그인 화면이 떠 있다'],
  elements: ['zone:CharSelect'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
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
  await test.step('일반 회원 계정으로 「게임 시작」을 누른다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 시작시도(화면, 나);
    const 로비 = await 로비화면.열기(game).then(
      () => true,
      () => false,
    );
    await verify('로비 화면이 보인다', 로비, true, { blocker: true });
    const hud = new 공통HUD(game);
    await hud.그려질때까지();
    const 레벨 = await verify('상단 바에 「Lv.」가 보인다', (await hud.레벨글()).startsWith('Lv.'), true);
    const 골드 = await verify('상단 바에 골드가 보인다', /^\d+ G$/.test(await hud.골드글()), true);
    await verify('로그인이 통과하면 캐릭터를 불러와 상단 바에 「Lv. 」와 골드가 보인다', 레벨 && 골드, true);
  });
});
