import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 우편보내고우편함열기 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-247',
  name: '우편이 두 통이면 나중에 온 우편이 위 줄에 보인다',
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
  await test.step('운영툴로 우편 두 통을 차례로 보내고 우편함을 연다', async () => {
    const { 함 } = await 우편보내고우편함열기(game, admin, 둘째, [
      { 제목: 'QA 우편 247 첫째', 아이템: [{ 이름: '체력 물약', 개수: 1 }] },
      { 제목: 'QA 우편 247 둘째', 아이템: [{ 이름: '체력 물약', 개수: 1 }] },
    ]);
    const 위 = await verify('나중에 온 우편이 맨 위 줄에 있다', ((await 함.줄제목(0)) ?? '').includes('둘째'), true);
    const 아래 = await verify('먼저 온 우편이 그 아래 줄에 있다', ((await 함.줄제목(1)) ?? '').includes('첫째'), true);
    await verify('우편이 두 통이면 나중에 온 우편이 위 줄에 보인다', 위 && 아래, true);
  });
});
