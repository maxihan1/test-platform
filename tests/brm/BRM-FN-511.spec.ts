import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 경험치막대있나, 글자색, 금색인가 } from './helpers/login-tools.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-511',
  name: '상단 바를 읽으면 상단 바에 금색 「Lv. 1」 · 「200 G」 · 경험치 막대와 「0/100」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['state:장소=로비', 'state:레벨=1'],
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
    await verify('로비 화면이 보인다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('상단 바를 읽는다', async () => {
    const 레벨 = await verify('상단 바 레벨 글이 「Lv. 」로 보인다', await hud.레벨글(), 'Lv. ');
    const 골드 = await verify('상단 바 골드 글이 「200 G」다', await hud.골드글(), '200 G');
    const 레벨색 = await verify('「Lv. 1」이 금색이다', 금색인가(await 글자색(game, 공통HUD.레벨줄)), true);
    const 골드색 = await verify('「200 G」가 금색이다', 금색인가(await 글자색(game, 공통HUD.골드줄)), true);
    const 막대 = await verify('경험치 막대가 보인다', await 경험치막대있나(game), true);
    const 경험치 = await verify('경험치 글이 「0/100」이다', await hud.경험치(), '0/100');
    await verify('상단 바를 읽으면 상단 바에 금색 「Lv. 1」 · 「200 G」 · 경험치 막대와 「0/100」이 보인다', 레벨 && 골드 && 레벨색 && 골드색 && 막대 && 경험치, true);
  });
});
