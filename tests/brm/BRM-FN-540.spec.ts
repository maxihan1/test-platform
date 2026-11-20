import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 우편보내고우편함열기 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-540',
  name: '첨부 있는 우편을 받고 우편함 창을 열면 우편 줄에 「● 」 붙은 제목과 「보낸 사람 · 날짜」 줄과 첨부 줄이 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어로 로비에 들어와 있다'],
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
  const hud = new 공통HUD(game);
  await test.step('두 번째 플레이어로 로비에 들어간다', async () => {
    await 로비로(game, driver, 둘째);
    await verify('상단 바에 「Lv.1」이 보인다', (await hud.레벨글()).startsWith('Lv.1 '), true, { blocker: true });
  });
  await test.step('첨부 있는 우편을 받고 우편함 창을 연다', async () => {
    const { 함 } = await 우편보내고우편함열기(game, admin, 둘째, [{ 제목: 'QA 우편 540', 아이템: [{ 이름: '체력 물약', 개수: 1 }], 골드: 10 }]);
    const 제목 = await verify('우편 줄 제목 앞에 「● 」가 붙는다', ((await 함.줄제목원문(0)) ?? '').includes('● '), true);
    const 보낸이 = await verify('우편 줄에 「보낸 사람 · 날짜」 줄이 보인다', /^.+ · .+$/.test((await 함.줄보낸이(0)) ?? ''), true);
    const 첨부 = await verify('우편 줄에 첨부 줄이 보인다', ((await 함.줄첨부(0)) ?? '').startsWith('첨부'), true);
    await verify('첨부 있는 우편을 받고 우편함 창을 열면 우편 줄에 「● 」 붙은 제목과 「보낸 사람 · 날짜」 줄과 첨부 줄이 보인다', 제목 && 보낸이 && 첨부, true);
  });
});
