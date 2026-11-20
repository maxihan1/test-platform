import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 우편보내고우편함열기, 우편함비었음뜰때까지, 확인창떴나 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-278',
  name: '「삭제」를 누르면 확인 창 없이 바로 처리된다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어에게 첨부 없는 우편이 와 있다'],
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
  await test.step('두 번째 플레이어에게 첨부 없는 우편이 와 있다', async () => {
    await 로비로(game, driver, 둘째);
    const { 함 } = await 우편보내고우편함열기(game, admin, 둘째, [{ 제목: 'QA 우편 278' }]);
    await verify('우편 줄에 「삭제」 버튼이 있다', await 함.삭제버튼있나(0), true, { blocker: true });
  });
  await test.step('그 우편의 「삭제」를 누른다', async () => {
    const 함 = await 우편함창.열기(game);
    await 함.삭제(0);
    const 처리됨 = await verify('우편이 바로 지워진다', await 우편함비었음뜰때까지(game), true);
    const 창없음 = await verify('확인 창이 뜨지 않는다', await 확인창떴나(game, '우편함'), false);
    await verify('「삭제」를 누르면 확인 창 없이 바로 처리된다', 처리됨 && 창없음, true);
  });
});
