import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 우편숫자될때까지, 우편함줄뜰때까지 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 기록없는첨부우편, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-269',
  name: '우편함 창을 열면 기록에 없는 첨부는 우편 줄에 「알 수 없는 아이템」으로 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어에게 기록에 없는 첨부를 단 우편이 와 있다'],
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
  await test.step('두 번째 플레이어에게 기록에 없는 첨부를 단 우편이 와 있다', async () => {
    await 로비로(game, driver, 둘째);
    await 기록없는첨부우편(admin, 둘째, 'QA 우편 269');
    await verify('메뉴 버튼에 「우편 1」이 보인다', await 우편숫자될때까지(game, 1), true, { blocker: true });
  });
  await test.step('우편함 창을 연다', async () => {
    const 함 = await 우편함창.열기(game);
    await 우편함줄뜰때까지(game, 1);
    await verify('우편함 창을 열면 기록에 없는 첨부는 우편 줄에 「알 수 없는 아이템」으로 보인다', ((await 함.줄첨부(0)) ?? '').includes('알 수 없는 아이템'), true);
  });
});
