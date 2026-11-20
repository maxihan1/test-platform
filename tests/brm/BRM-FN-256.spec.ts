import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 우편보내고우편함열기 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 지급회수 } from './helpers/game-state.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-256',
  name: '첨부가 회수된 우편의 「받기」를 누르면 「받을 첨부가 없습니다」 오류 알림이 뜬다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어의 우편함 창에 첨부 있는 우편이 보인다'],
  techniques: ['동등 분할'],
  elements: ['item:체력 물약'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 둘째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  let 지급번호 = 0;
  await test.cleanup('켜 둔 봇 끄기 · 두 번째 플레이어 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 둘째);
  });
  const hud = new 공통HUD(game);
  await test.step('두 번째 플레이어의 우편함 창에 첨부 있는 우편이 보인다', async () => {
    await 로비로(game, driver, 둘째);
    const { 함, 번호들 } = await 우편보내고우편함열기(game, admin, 둘째, [{ 제목: 'QA 우편 256', 아이템: [{ 이름: '체력 물약', 개수: 1 }] }]);
    지급번호 = 번호들[0] ?? 0;
    await verify('우편 줄에 「받기」 버튼이 있다', await 함.받기버튼있나(0), true, { blocker: true });
  });
  await test.step('운영툴로 그 첨부를 회수한 뒤 「받기」를 누른다', async () => {
    await 지급회수(admin, 지급번호);
    const 함 = await 우편함창.열기(game);
    await 함.받기(0);
    await verify('첨부가 회수된 우편의 「받기」를 누르면 「받을 첨부가 없습니다」 오류 알림이 뜬다', await hud.알림뜸('받을 첨부가 없습니다'), true);
  });
});
