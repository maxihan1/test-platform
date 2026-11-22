import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 우편으로아이템받기 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-196',
  name: '가방 창에서 그 줄 설명을 읽으면 알 수 없는 아이템의 설명은 「알 수 없는 아이템」이다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어 가방에 게임에 없는 이름의 아이템이 있다'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.p2Id ?? '';
  const 비밀번호 = params.p2Password ?? '';
  const 이름 = 'QA 수상한 돌';
  await test.cleanup('두 번째 플레이어를 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('두 번째 플레이어로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('두 번째 플레이어 가방에 게임에 없는 이름의 아이템이 있는 것을 확인한다', async () => {
    await 우편으로아이템받기(game, admin, 아이디, 이름);
    const 가방 = await 가방창.열기(game);
    await verify('가방에 게임에 없는 이름의 아이템 줄이 있다', await 가방.줄이생길때까지(이름), true, { blocker: true });
    await 가방.닫기();
  });

  await test.step('가방 창에서 그 줄 설명을 읽는다', async () => {
    const 가방 = await 가방창.열기(game);
    const 줄 = await 가방.줄찾기(이름);
    await 가방.닫기();
    await verify('가방 창에서 그 줄 설명을 읽으면 알 수 없는 아이템의 설명은 「알 수 없는 아이템」이다', 색글떼기(줄?.설명 ?? ''), '알 수 없는 아이템');
  });
});
