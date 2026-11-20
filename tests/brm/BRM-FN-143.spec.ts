import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 떠오른글읽기, 보내고시각재기 } from './helpers/dungeon-tools.helper.js';
import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 레벨맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-143',
  name: '레벨이 오르면 화면 가운데에 큰 금색 글씨 「레벨 업!」이 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['level:1', 'level:2'],
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
  await test.step('「/gm exp 100」을 보낸다', async () => {
    await 로비화면.열기(game);
    await 레벨맞추기(game, 1);
    await 보내고시각재기(game, '/gm exp 100');
    const 글 = await 떠오른글읽기(game, 공통HUD.큰알림('레벨 업!'), 15_000);
    const 떴다 = await verify('화면 가운데에 「레벨 업!」이 뜬다', 글 !== null, true);
    const 금색 = await verify('글씨 색이 금색이다', 글?.색, '금색');
    await verify('레벨이 오르면 화면 가운데에 큰 금색 글씨 「레벨 업!」이 뜬다', 떴다 && 금색, true);
  });
});
