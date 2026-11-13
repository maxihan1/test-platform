import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 무기되돌리기, 처음무기읽기 } from './helpers/shop-state.helper.js';
import { 가진개수, 개수맞추기, 무기장착 } from './helpers/items.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-320',
  name: '빈 장착 칸에는 「비어 있음」, 장착한 칸에는 아이템 이름 · 설명 · 「해제」가 보인다',
  platforms: ['android'],
  precondition: ['무기 칸에만 장비가 있고 로비에 있다'],
  elements: ['item:rusty_dagger'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    빈칸글: z.string().describe('빈 장착 칸 글자').default('비어 있음'),
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
    await test.step('무기 칸에 장비가 있게 맞춘다', async () => {
      if (처음무기 === expected.빈칸글) await 무기장착(game, '녹슨 단검');
      const 가방 = await 가방창.열기(game);
      await verify('무기 칸에 장비 이름이 보인다', (await 가방.칸이름('무기')) !== expected.빈칸글, true, { blocker: true });
    });

    await test.step('가방 창 장착 칸을 확인한다', async () => {
      const 가방 = await 가방창.열기(game);
      const 갑옷 = await verify('갑옷 칸에 「비어 있음」이 보인다', await 가방.칸이름('갑옷'), expected.빈칸글);
      const 장신구 = await verify('장신구 칸에 「비어 있음」이 보인다', await 가방.칸이름('장신구'), expected.빈칸글);
      const 이름 = await verify('무기 칸에 아이템 이름이 보인다', (await 가방.칸이름('무기')).length > 0, true);
      const 설명 = await verify('무기 칸에 아이템 설명이 보인다', (await 가방.칸설명('무기')).length > 0, true);
      const 해제 = await verify('무기 칸에 「해제」가 보인다', await 가방.해제있는지('무기'), true);
      await verify('빈 장착 칸에는 「비어 있음」, 장착한 칸에는 아이템 이름 · 설명 · 「해제」가 보인다', 갑옷 && 장신구 && 이름 && 설명 && 해제, true);
    });
  } finally {
    await 무기되돌리기(game, 처음무기);
    await 개수맞추기(game, '녹슨 단검', 앞개수);
  }
});
