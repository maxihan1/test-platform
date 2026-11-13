import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방에채우기, 무기되돌리기, 처음무기읽기 } from './helpers/shop-state.helper.js';
import { 가진개수, 개수맞추기 } from './helpers/items.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-136',
  name: '「녹슨 단검」을 장착하면 무기 칸에 「녹슨 단검」이 보이고 가방 목록에서 한 줄 줄어든다',
  platforms: ['android'],
  precondition: ['가방에 「녹슨 단검」이 있고 로비에 있다'],
  techniques: ['상태 전이'],
  elements: ['item:rusty_dagger'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    무기칸: z.string().describe('장착한 무기 칸 이름').default('녹슨 단검'),
    줄어든줄수: z.number().describe('가방 목록에서 줄어드는 「녹슨 단검」 줄 수').default(1),
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
    await test.step('가방에 「녹슨 단검」이 있게 채운다', async () => {
      await 가방에채우기(game, '녹슨 단검', 1);
      const 가방 = await 가방창.열기(game);
      await verify('가방 목록에 「녹슨 단검」 줄이 보인다', (await 가방.줄개수('녹슨 단검')) >= 1, true, { blocker: true });
    });

    await test.step('가방 창에서 「녹슨 단검」의 「장착」을 누른다', async () => {
      const 가방 = await 가방창.열기(game);
      const 앞줄수 = await 가방.줄개수('녹슨 단검');
      await 가방.장착하기('녹슨 단검');
      await 가방.칸이될때까지('무기', expected.무기칸);
      const 칸 = await verify('무기 칸에 「녹슨 단검」이 보인다', await 가방.칸이름('무기'), expected.무기칸);
      const 줄 = await verify('가방 목록의 「녹슨 단검」 줄이 한 줄 줄어든다', 앞줄수 - (await 가방.줄개수('녹슨 단검')), expected.줄어든줄수);
      await verify('「녹슨 단검」을 장착하면 무기 칸에 「녹슨 단검」이 보이고 가방 목록에서 한 줄 줄어든다', 칸 && 줄, true);
    });
  } finally {
    await 무기되돌리기(game, 처음무기);
    await 개수맞추기(game, '녹슨 단검', 앞개수);
  }
});
