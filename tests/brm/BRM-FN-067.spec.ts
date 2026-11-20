import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 게임다시켜기, 로그인하기, 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 골드맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-067',
  name: '골드를 바꾼 뒤 접속을 끊고 다시 로그인하면 골드가 「300 G」로 남아 있다',
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
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('로비 화면이 보인다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('「/gm gold 300」을 보낸 뒤 「메인 메뉴로」 없이 게임을 끄고 다시 로그인한다', async () => {
    await 골드맞추기(game, 300);
    await 게임다시켜기(game, driver);
    await 로그인하기(game, driver, 나);
    const hud = new 공통HUD(game);
    await hud.골드가될때까지('300 G');
    await verify('골드를 바꾼 뒤 접속을 끊고 다시 로그인하면 골드가 「300 G」로 남아 있다', await hud.골드글(), '300 G');
  });
});
