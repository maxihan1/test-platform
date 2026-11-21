import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 서버골드가될때까지 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-204',
  name: '상단 바와 상점 창의 골드 표시를 읽으면 골드 200 인 캐릭터는 상단 바에 「200 G」로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['flow:골드-시작 지급'],
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
  await test.step('일반 회원으로 로비에 들어가 골드를 확인한다', async () => {
    await 로비로(game, driver, 나);
    await verify('운영툴 캐릭터 골드가 200 이다', await 서버골드가될때까지(admin, 나, 200), 200, { blocker: true });
  });
  await test.step('상단 바와 상점 창의 골드 표시를 읽는다', async () => {
    const 상점 = await 상점창.열기(game);
    await verify('상단 바와 상점 창의 골드 표시를 읽으면 골드 200 인 캐릭터는 상단 바에 「200 G」로 보인다', await hud.골드글(), '200 G');
    await verify('상점 창에 「보유 골드 200」이 보인다', await 상점.보유골드글(), '보유 골드 200');
  });
});
