import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 상점줄, 자리바뀜, 화면안인가, 화면자리 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-534',
  name: '상점 목록을 끌면 위아래로 넘어가 마지막 「체력 물약」 줄이 화면 안에 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['shop:체력 물약'],
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
  await test.step('상점 목록을 아래로 끌어 넘긴다', async () => {
    const 상점 = await 상점창.열기(game);
    const 마지막 = (await 상점.줄수()) - 1;
    const 처음자리 = (await 화면자리(game, 상점창.줄주소(0)))?.rect ?? null;
    await 상점.끌어서넘기기(마지막, 0);
    const 넘어감 = await verify('목록이 위아래로 넘어간다', await 자리바뀜(game, 상점창.줄주소(0), 처음자리), true);
    const 줄 = await 상점줄(상점, '체력 물약');
    const 보임 = await verify('「체력 물약」 줄이 화면 안에 있다', await 화면안인가(game, 상점창.줄주소(줄)), true);
    const 끝줄 = await verify('「체력 물약」 줄이 마지막 줄이다', 줄 === 마지막, true);
    await verify('상점 목록을 끌면 위아래로 넘어가 마지막 「체력 물약」 줄이 화면 안에 보인다', 넘어감 && 보임 && 끝줄, true);
  });
});
