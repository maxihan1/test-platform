import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 우편보내기만, 우편함줄뜰때까지 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 지급회수 } from './helpers/game-state.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-281',
  name: '운영툴에서 아직 안 받은 첨부를 회수하면 우편함에서 그 첨부가 사라진다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어에게 첨부 있는 우편이 와 있다'],
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
  await test.step('두 번째 플레이어에게 첨부 있는 우편이 와 있다', async () => {
    await 로비로(game, driver, 둘째);
    const 번호들 = await 우편보내기만(game, admin, 둘째, [{ 제목: 'QA 우편 281', 아이템: [{ 이름: '체력 물약', 개수: 1 }] }]);
    지급번호 = 번호들[0] ?? 0;
    await verify('메뉴 버튼에 「우편 1」이 보인다', await hud.메뉴글('우편'), '우편 1', { blocker: true });
  });
  await test.step('운영툴로 그 첨부를 회수하고 우편함 창을 연다', async () => {
    await 지급회수(admin, 지급번호);
    const 함 = await 우편함창.열기(game);
    await 우편함줄뜰때까지(game, 1);
    const 줄 = await 함.줄찾기('QA 우편 281');
    const 보이는글 = 줄 === null ? await 함.비었음글() : await 함.줄첨부(줄);
    await verify('운영툴에서 아직 안 받은 첨부를 회수하면 우편함에서 그 첨부가 사라진다', 보이는글 === '첨부 없음' || 보이는글 === '받은 우편이 없습니다', true);
  });
});
