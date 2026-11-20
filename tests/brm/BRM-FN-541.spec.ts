import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 색이름, 우편보내고우편함열기 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-541',
  name: '첨부가 있으면 금색 「첨부: 체력 물약 x1, 10 골드」, 없으면 회색 「첨부 없음」이 보인다',
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
  await test.step('체력 물약 1개 · 골드 10 첨부 우편과 첨부 없는 우편을 받고 우편함 창을 연다', async () => {
    const { 함 } = await 우편보내고우편함열기(game, admin, 둘째, [
      { 제목: 'QA 우편 541 첨부', 아이템: [{ 이름: '체력 물약', 개수: 1 }], 골드: 10 },
      { 제목: 'QA 우편 541 없음' },
    ]);
    const 있음줄 = (await 함.줄찾기('QA 우편 541 첨부')) ?? 0;
    const 없음줄 = (await 함.줄찾기('QA 우편 541 없음')) ?? 0;
    const 있음글 = await verify('첨부 줄이 「첨부: 체력 물약 x1, 10 골드」다', await 함.줄첨부(있음줄), '첨부: 체력 물약 x1, 10 골드');
    const 있음색 = await verify('첨부 줄이 금색이다', 색이름((await 함.줄첨부원문(있음줄)) ?? ''), '금색');
    const 없음글 = await verify('첨부 없는 우편 줄이 「첨부 없음」이다', await 함.줄첨부(없음줄), '첨부 없음');
    const 없음색 = await verify('「첨부 없음」이 회색이다', 색이름((await 함.줄첨부원문(없음줄)) ?? ''), '회색');
    await verify('첨부가 있으면 금색 「첨부: 체력 물약 x1, 10 골드」, 없으면 회색 「첨부 없음」이 보인다', 있음글 && 있음색 && 없음글 && 없음색, true);
  });
});
