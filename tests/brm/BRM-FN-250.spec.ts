import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 색이름, 우편메뉴원문, 우편보내기만 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-250',
  name: '안 읽었거나 첨부가 남은 우편이 한 통이면 메뉴 버튼에 빨간 「우편 1」이 보인다',
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
  await test.step('운영툴로 첨부 있는 우편 한 통을 보낸다', async () => {
    await 우편보내기만(game, admin, 둘째, [{ 제목: 'QA 우편 250', 아이템: [{ 이름: '체력 물약', 개수: 1 }] }]);
    const 글 = await verify('메뉴 버튼에 「우편 1」이 보인다', await hud.메뉴글('우편'), '우편 1');
    const 빨강 = await verify('메뉴 버튼 숫자가 빨간색이다', 색이름(await 우편메뉴원문(game)), '빨강');
    await verify('안 읽었거나 첨부가 남은 우편이 한 통이면 메뉴 버튼에 빨간 「우편 1」이 보인다', 글 && 빨강, true);
  });
});
