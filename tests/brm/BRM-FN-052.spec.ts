import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 화면에글있나 } from './helpers/login-tools.helper.js';
import { 지금화면, 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-052',
  name: '로그인하면 캐릭터 고르기 화면 없이 바로 로비가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['state:장소=로비'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기', () => 봇모두끄기(admin));
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('일반 회원으로 로비에 들어와 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('가방 · 상점 · 메뉴를 훑어 캐릭터 고르기 화면이 있는지 본다', async () => {
    await 가방창.열기(game);
    await 상점창.열기(game);
    const 고르기 = await verify('캐릭터 고르기 글이 보이지 않는다', await 화면에글있나(game, '캐릭터 고르기'), false);
    const 선택 = await verify('캐릭터 선택 글이 보이지 않는다', await 화면에글있나(game, '캐릭터 선택'), false);
    const 로비 = await verify('로비 화면이 보인다', await 지금화면(game), '로비');
    await 공통HUD.열린창모두닫기(game);
    await verify('로그인하면 캐릭터 고르기 화면 없이 바로 로비가 보인다', 고르기 && 선택 && 로비, true);
  });
});
