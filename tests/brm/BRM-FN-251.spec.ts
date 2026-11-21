import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 우편보내고우편함열기, 우편숫자없어질때까지 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 열린창닫기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-251',
  name: '안 읽었거나 첨부가 남은 우편이 없으면 메뉴 버튼이 숫자 없이 「우편」이다',
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
  await test.step('골드 10 을 단 우편 한 통을 받아 첨부를 비우고 우편함 창을 닫는다', async () => {
    const { 함 } = await 우편보내고우편함열기(game, admin, 둘째, [{ 제목: 'QA 우편 251', 골드: 10 }]);
    await 함.받기(0);
    await verify('우편 줄이 「첨부 없음」이 된다', await 함.줄첨부가될때까지(0, '첨부 없음'), true, { blocker: true });
    await 열린창닫기(game);
    await 우편숫자없어질때까지(game);
    await verify('안 읽었거나 첨부가 남은 우편이 없으면 메뉴 버튼이 숫자 없이 「우편」이다', await hud.메뉴글('우편'), '우편');
  });
});
