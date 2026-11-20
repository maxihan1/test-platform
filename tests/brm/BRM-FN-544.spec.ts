import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 왼쪽아래인가 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-544',
  name: '우편함 창을 열면 우편함 창 왼쪽 아래에 「모두 받기」가 보인다',
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
  await test.step('우편함 창을 연다', async () => {
    const 함 = await 우편함창.열기(game);
    const 있음 = await verify('우편함 창에 「모두 받기」가 보인다', await 함.모두받기있나(), true);
    const 자리 = await verify('「모두 받기」가 우편함 창 왼쪽 아래에 있다', await 왼쪽아래인가(game, 우편함창.모두받기버튼, 우편함창.판), true);
    await verify('우편함 창을 열면 우편함 창 왼쪽 아래에 「모두 받기」가 보인다', 있음 && 자리, true);
  });
});
