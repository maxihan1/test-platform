import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 무기되돌리기, 처음무기읽기 } from './helpers/shop-state.helper.js';
import { 가진개수, 개수맞추기, 무기장착 } from './helpers/items.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-184',
  name: '가방 창을 열면 장착 중인 「녹슨 단검」은 가방 목록에 없어 그 판매 버튼이 보이지 않는다',
  platforms: ['android'],
  precondition: ['무기 칸에 「녹슨 단검」이 장착돼 있고 가방에 다른 「녹슨 단검」이 없다'],
  techniques: ['상태 전이'],
  elements: ['item:rusty_dagger'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    판매버튼글: z.string().describe('「녹슨 단검」 판매 버튼 글자').default('판매 20G'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  const 앞개수 = await 가진개수(game, '녹슨 단검');
  const 처음무기 = await 처음무기읽기(game);
  try {
    await test.step('무기 칸에 「녹슨 단검」을 장착하고 가방에는 남기지 않는다', async () => {
      await 무기장착(game, '녹슨 단검');
      await 개수맞추기(game, '녹슨 단검', 0);
      const 가방 = await 가방창.열기(game);
      await verify('무기 칸에 「녹슨 단검」이 보인다', await 가방.칸이름('무기'), '녹슨 단검', { blocker: true });
    });

    await test.step('가방 창을 연다', async () => {
      const 가방 = await 가방창.열기(game);
      const 목록에없다 = await verify('가방 목록에 「녹슨 단검」 줄이 없다', await 가방.줄개수('녹슨 단검'), 0);
      const 버튼없다 = await verify('가방 목록에 「판매 20G」 버튼이 없다', (await 가방.판매버튼글들()).includes(expected.판매버튼글), false);
      await verify('가방 창을 열면 장착 중인 「녹슨 단검」은 가방 목록에 없어 그 판매 버튼이 보이지 않는다', 목록에없다 && 버튼없다, true);
    });
  } finally {
    await 무기되돌리기(game, 처음무기);
    await 개수맞추기(game, '녹슨 단검', 앞개수);
  }
});
