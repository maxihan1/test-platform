import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 우편보내고우편함열기 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-275',
  name: '첨부 있는 우편이 없을 때 「모두 받기」를 누르면 「받을 첨부가 없습니다」 오류 알림이 뜬다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어에게 첨부 없는 우편만 와 있다'],
  techniques: ['동등 분할'],
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
  await test.step('두 번째 플레이어에게 첨부 없는 우편만 와 있다', async () => {
    await 로비로(game, driver, 둘째);
    const { 함 } = await 우편보내고우편함열기(game, admin, 둘째, [{ 제목: 'QA 우편 275' }]);
    await verify('우편 줄에 「받기」 버튼이 없다', await 함.받기버튼있나(0), false, { blocker: true });
  });
  await test.step('우편함 창에서 「모두 받기」를 누른다', async () => {
    const 함 = await 우편함창.열기(game);
    await 함.모두받기();
    await verify('첨부 있는 우편이 없을 때 「모두 받기」를 누르면 「받을 첨부가 없습니다」 오류 알림이 뜬다', await hud.알림뜸('받을 첨부가 없습니다'), true);
  });
});
