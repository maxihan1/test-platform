import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 서버개수, 체력물약모두팔기 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-240',
  name: '체력 물약 3개를 모두 팔면 가방에서 체력 물약 줄이 사라진다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['item:체력 물약', 'flow:골드-판매'],
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
  await test.step('가방 창의 체력 물약 줄 「판매 7G」를 세 번 누른다', async () => {
    await 체력물약모두팔기(game);
    const 가방 = await 가방창.열기(game);
    const 화면 = await verify('가방 창에 체력 물약 줄이 없다', await 가방.이름줄수('체력 물약'), 0);
    const 서버 = await verify('운영툴 캐릭터 아이템에서 체력 물약이 0개다', await 서버개수(admin, 나, '체력 물약'), 0);
    await verify('체력 물약 3개를 모두 팔면 가방에서 체력 물약 줄이 사라진다', 화면 && 서버, true);
  });
});
