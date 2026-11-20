import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 알림수, 알림수될때까지, 우편보내고우편함열기 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-273',
  name: '「모두 받기」를 누르면 두 우편을 하나씩 받아 받기 알림이 두 번 뜬다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어에게 첨부 있는 우편이 두 통 와 있다'],
  elements: ['item:체력 물약'],
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
  await test.step('두 번째 플레이어에게 첨부 있는 우편이 두 통 와 있다', async () => {
    await 로비로(game, driver, 둘째);
    const { 함 } = await 우편보내고우편함열기(game, admin, 둘째, [
      { 제목: 'QA 우편 273 첫째', 아이템: [{ 이름: '체력 물약', 개수: 1 }] },
      { 제목: 'QA 우편 273 둘째', 아이템: [{ 이름: '체력 물약', 개수: 1 }] },
    ]);
    await verify('두 우편 줄에 「받기」 버튼이 있다', (await 함.받기버튼있나(0)) && (await 함.받기버튼있나(1)), true, { blocker: true });
  });
  await test.step('우편함 창에서 「모두 받기」를 누른다', async () => {
    const 함 = await 우편함창.열기(game);
    await 함.모두받기();
    await 알림수될때까지(game, '받음', 2);
    const 알림 = await verify('받기 알림이 두 번 뜬다', await 알림수(game, '받음'), 2);
    const 첫째 = await verify('첫 우편 줄이 「첨부 없음」이다', await 함.줄첨부(0), '첨부 없음');
    const 둘째줄 = await verify('둘째 우편 줄이 「첨부 없음」이다', await 함.줄첨부(1), '첨부 없음');
    await verify('「모두 받기」를 누르면 두 우편을 하나씩 받아 받기 알림이 두 번 뜬다', 알림 && 첫째 && 둘째줄, true);
  });
});
