import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 우편보내고우편함열기, 우편함줄뜰때까지 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-249',
  name: '우편함 창을 열어 목록에 보이면 안 읽은 우편이 읽음으로 바뀌어 다시 열 때 「● 」가 없다',
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
  await test.step('운영툴로 첨부 없는 우편을 보내고 우편함 창을 열었다 닫는다', async () => {
    const { 함 } = await 우편보내고우편함열기(game, admin, 둘째, [{ 제목: 'QA 우편 249' }]);
    await 함.닫기();
    await 함.닫힐때까지();
    const 다시 = await 우편함창.열기(game);
    await 우편함줄뜰때까지(game, 1);
    await verify('우편함 창을 열어 목록에 보이면 안 읽은 우편이 읽음으로 바뀌어 다시 열 때 「● 」가 없다', ((await 다시.줄제목원문(0)) ?? '').includes('●'), false);
  });
});
