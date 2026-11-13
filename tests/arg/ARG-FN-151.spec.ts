import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방에채우기 } from './helpers/shop-state.helper.js';
import { 가진개수, 개수맞추기 } from './helpers/items.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-151',
  name: '로비에서 「체력 물약」을 쓰면 「던전에서 살아 있을 때만 쓸 수 있습니다」 알림이 뜬다',
  platforms: ['android'],
  precondition: ['가방에 「체력 물약」이 있고 로비에 있다'],
  techniques: ['동등 분할'],
  elements: ['item:health_potion', 'move:물약 로비에서 사용', 'state:장소=로비'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    알림글: z.string().describe('물약 사용 거절 알림 문구').default('던전에서 살아 있을 때만 쓸 수 있습니다'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  const 앞개수 = await 가진개수(game, '체력 물약');
  try {
    await test.step('가방에 「체력 물약」이 있게 채운다', async () => {
      await 가방에채우기(game, '체력 물약', 1);
      const 가방 = await 가방창.열기(game);
      await verify('가방 목록에 「체력 물약」 줄이 보인다', (await 가방.줄개수('체력 물약')) >= 1, true, { blocker: true });
    });

    await test.step('로비 가방 창에서 「체력 물약」의 「사용」을 누른다', async () => {
      const 가방 = await 가방창.열기(game);
      await 가방.사용하기('체력 물약');
      await verify('로비에서 「체력 물약」을 쓰면 「던전에서 살아 있을 때만 쓸 수 있습니다」 알림이 뜬다', await 가방.hud.알림.뜨는지(expected.알림글), true);
    });
  } finally {
    await 개수맞추기(game, '체력 물약', 앞개수);
  }
});
