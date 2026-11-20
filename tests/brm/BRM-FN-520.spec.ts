import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-520',
  name: '장비가 없으면 장착 칸 셋에 「비어 있음」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
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
    await verify('상단 바에 「Lv.1」이 보인다', (await hud.레벨글()).startsWith('Lv.1 '), true, { blocker: true });
  });
  await test.step('가방 창을 연다', async () => {
    const 가방 = await 가방창.열기(game);
    const 무기 = await verify('무기 칸이 「비어 있음」이다', await 가방.칸내용('무기'), '비어 있음');
    const 갑옷 = await verify('갑옷 칸이 「비어 있음」이다', await 가방.칸내용('갑옷'), '비어 있음');
    const 장신구 = await verify('장신구 칸이 「비어 있음」이다', await 가방.칸내용('장신구'), '비어 있음');
    await verify('장비가 없으면 장착 칸 셋에 「비어 있음」이 보인다', 무기 && 갑옷 && 장신구, true);
  });
});
