import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 서버골드, 우편보내고우편함열기, 팔기 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-207',
  name: '우편 첨부 골드 50 을 받으면 골드가 50 는다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어로 로비에 들어와 있다', '일반 회원으로 로비에 들어와 있다'],
  elements: ['flow:골드-우편', 'flow:골드-판매', 'item:체력 물약'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 둘째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 · 두 번째 플레이어 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 둘째);
  });
  const hud = new 공통HUD(game);
  await test.step('두 번째 플레이어로 로비에 들어간다', async () => {
    await 로비로(game, driver, 둘째);
    await verify('운영툴 캐릭터 골드가 200 이다', await 서버골드(admin, 둘째), 200, { blocker: true });
  });
  await test.step('운영툴 우편으로 골드 50 을 보내고 받는다', async () => {
    const { 함 } = await 우편보내고우편함열기(game, admin, 둘째, [{ 제목: 'QA 우편 207', 골드: 50 }]);
    await 함.받기(0);
    await hud.골드가될때까지('250 G');
    const 서버 = await verify('운영툴 캐릭터 골드가 250 이다', await 서버골드(admin, 둘째), 250);
    const 화면 = await verify('상단 바 골드가 「250 G」다', await hud.골드글(), '250 G');
    await verify('우편 첨부 골드 50 을 받으면 골드가 50 는다', 서버 && 화면, true);
  });
  await test.step('일반 회원으로 로비에 들어가 골드를 확인한다', async () => {
    await 로비로(game, driver, 나);
    await verify('운영툴 캐릭터 골드가 200 이다', await 서버골드(admin, 나), 200, { blocker: true });
  });
  await test.step('체력 물약 하나를 판다', async () => {
    await 팔기(game, '체력 물약', 7);
    const 서버 = await verify('운영툴 캐릭터 골드가 207 이다', await 서버골드(admin, 나), 207);
    const 화면 = await verify('상단 바 골드가 「207 G」다', await hud.골드글(), '207 G');
    await verify('골드가 7 는다', 서버 && 화면, true);
  });
});
