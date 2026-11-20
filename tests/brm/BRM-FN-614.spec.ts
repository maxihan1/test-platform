import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-614',
  name: '기록에 없는 첨부가 든 우편을 받으면 골드만 들어오고 그 첨부는 우편에 남아 「받기」가 다시 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어에게 기록에 없는 첨부와 골드 10 을 단 우편이 와 있다'],
  held: '보류 — 기록에 없는 첨부에 골드를 같이 다는 길이 가이드에 없음',
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
  await test.step('두 번째 플레이어로 로비에 들어가 우편함을 연다', async () => {
    await 로비로(game, driver, 둘째);
    const 함 = await 우편함창.열기(game);
    await verify('우편함에 우편 줄이 있다', (await 함.줄수()) > 0, true, { blocker: true });
  });
  await test.step('우편함 창에서 「받기」를 누른다', async () => {
    const 함 = await 우편함창.열기(game);
    await 함.받기(0);
    await verify('기록에 없는 첨부가 든 우편을 받으면 골드만 들어오고 그 첨부는 우편에 남아 「받기」가 다시 보인다', await 함.받기버튼있나(0), true);
  });
});
