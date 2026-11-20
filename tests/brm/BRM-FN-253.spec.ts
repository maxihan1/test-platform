import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 우편지급 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-253',
  name: '접속 중에 새 우편이 오면 「새 우편 1통이 도착했습니다」 알림이 뜬다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어로 로비에 들어와 있다'],
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
  await test.step('두 번째 플레이어로 로비에 들어간다', async () => {
    await 로비로(game, driver, 둘째);
    await verify('상단 바에 「Lv.1」이 보인다', (await hud.레벨글()).startsWith('Lv.1 '), true, { blocker: true });
  });
  await test.step('운영툴로 우편 한 통을 보낸다', async () => {
    await 우편지급(admin, 둘째, { 제목: 'QA 우편 253', 아이템: [{ 이름: '체력 물약', 개수: 1 }] });
    await verify('접속 중에 새 우편이 오면 「새 우편 1통이 도착했습니다」 알림이 뜬다', await hud.알림뜸('새 우편 1통이 도착했습니다', 40_000), true);
  });
});
