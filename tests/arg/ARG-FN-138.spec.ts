import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방에채우기, 무기되돌리기, 처음무기읽기 } from './helpers/shop-state.helper.js';
import { 가진개수, 개수맞추기 } from './helpers/items.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-138',
  name: '가방에서 「녹슨 단검」의 「장착」을 누르면 「녹슨 단검 장착」 알림이 뜬다',
  platforms: ['android'],
  precondition: ['가방에 「녹슨 단검」이 있고 로비에 있다'],
  elements: ['item:rusty_dagger'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    알림글: z.string().describe('장착 알림 문구').default('녹슨 단검 장착'),
  }),
  smoke: true,
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  const 앞개수 = await 가진개수(game, '녹슨 단검');
  const 처음무기 = await 처음무기읽기(game);
  try {
    await test.step('가방에 「녹슨 단검」이 있게 채운다', async () => {
      await 가방에채우기(game, '녹슨 단검', 1);
      const 가방 = await 가방창.열기(game);
      await verify('가방 목록에 「녹슨 단검」 줄이 보인다', (await 가방.줄개수('녹슨 단검')) >= 1, true, { blocker: true });
    });

    await test.step('가방 창에서 「녹슨 단검」의 「장착」을 누른다', async () => {
      const 가방 = await 가방창.열기(game);
      await 가방.장착하기('녹슨 단검');
      await verify('가방에서 「녹슨 단검」의 「장착」을 누르면 「녹슨 단검 장착」 알림이 뜬다', await 가방.hud.알림.뜨는지(expected.알림글), true);
    });
  } finally {
    await 무기되돌리기(game, 처음무기);
    await 개수맞추기(game, '녹슨 단검', 앞개수);
  }
});
