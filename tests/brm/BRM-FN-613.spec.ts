import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 서버골드가될때까지, 우편보내고우편함열기 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-613',
  name: '「받기」를 빠르게 두 번 누르면 골드가 10 만 는다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어에게 골드 10 이 첨부된 우편이 와 있다'],
  techniques: ['오류 추정'],
  elements: ['flow:골드-우편'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 둘째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 두 번째 플레이어 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 둘째);
  });
  const hud = new 공통HUD(game);
  await test.step('두 번째 플레이어에게 골드 10 이 첨부된 우편이 와 있다', async () => {
    await 로비로(game, driver, 둘째);
    const { 함 } = await 우편보내고우편함열기(game, admin, 둘째, [{ 제목: 'QA 우편 613', 골드: 10 }]);
    await verify('우편 줄에 「받기」 버튼이 있다', await 함.받기버튼있나(0), true, { blocker: true });
  });
  await test.step('「받기」를 빠르게 두 번 누른다', async () => {
    const 함 = await 우편함창.열기(game);
    await Promise.all([함.받기(0), 함.받기(0)]);
    await hud.골드가될때까지('210 G', 20_000);
    const 화면 = await verify('상단 바 골드가 「210 G」다', await hud.골드글(), '210 G');
    const 서버 = await verify('운영툴 캐릭터 골드가 210 이다', await 서버골드가될때까지(admin, 둘째, 210), 210);
    await verify('「받기」를 빠르게 두 번 누르면 골드가 10 만 는다', 화면 && 서버, true);
  });
});
