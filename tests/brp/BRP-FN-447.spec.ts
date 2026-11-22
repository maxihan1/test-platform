import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 우편으로아이템받기 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-447',
  name: '아이템 이름이 띄어쓰기 한 글자라도 다르면 받은 아이템 설명이 「알 수 없는 아이템」이다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어로 로그인해 로비에 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.p2Id ?? '';
  const 비밀번호 = params.p2Password ?? '';
  await test.cleanup('두 번째 플레이어를 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('두 번째 플레이어로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('「체력 물약」을 띄어쓰기 없이 「체력물약」으로 적은 아이템을 우편으로 지급하고 받는다', async () => {
    await 우편으로아이템받기(game, admin, 아이디, '체력물약');
    const 가방 = await 가방창.열기(game);
    await verify('가방에 「체력물약」 줄이 있다', await 가방.줄이생길때까지('체력물약'), true, { blocker: true });
    const 줄 = await 가방.줄찾기('체력물약');
    await 가방.닫기();
    await verify('아이템 이름이 띄어쓰기 한 글자라도 다르면 받은 아이템 설명이 「알 수 없는 아이템」이다', 색글떼기(줄?.설명 ?? ''), '알 수 없는 아이템');
  });
});
