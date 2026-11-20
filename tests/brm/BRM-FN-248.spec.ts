import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 우편보내고우편함열기 } from './helpers/items-tools.helper.js';
import { 글자색, 금색인가 } from './helpers/social-tools.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-248',
  name: '안 읽은 우편을 처음 보면 제목 앞에 금색 「● 」가 붙고 줄 바탕이 옅은 금색이다',
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
  await test.step('두 번째 플레이어로 로비에 들어간다', async () => {
    await 계정되돌리기(admin, 둘째);
    await 로비로(game, driver, 둘째);
    await verify('로비 화면이 보인다', await 로비화면.열기(game).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('운영툴로 우편을 보내고 우편함 창을 연다', async () => {
    const { 함 } = await 우편보내고우편함열기(game, admin, 둘째, [{ 제목: 'QA 우편 248', 아이템: [{ 이름: '체력 물약', 개수: 1 }] }]);
    const 제목원문 = (await 함.줄제목원문(0)) ?? '';
    const 점 = await verify('제목 앞에 「● 」가 붙는다', 제목원문.replace(/<[^>]+>/g, '').startsWith('● '), true);
    const 점색 = await verify('「● 」가 금색이다', 금색인가(글자색(제목원문)), true);
    const [r = 0, g = 0, b = 0, a = 0] = await 함.줄바탕색(0);
    const 바탕 = await verify('줄 바탕이 옅은 금색이다', r > 0.4 && g > 0.3 && b < g && r >= g && a > 0, true);
    await verify('안 읽은 우편을 처음 보면 제목 앞에 금색 「● 」가 붙고 줄 바탕이 옅은 금색이다', 점 && 점색 && 바탕, true);
  });
});
