import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 새계정, 캐릭터더하기, type 계정 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-118',
  name: '새 캐릭터를 만들면 가방에 빨간 물약이 10개 있다',
  platforms: ['android'],
  precondition: ['로그인한 계정이 있다'],
  elements: ['item:potion_hp_s'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 주인: 계정 | undefined;
  try {
    await test.step('로그인한 계정을 만든다', async () => {
      주인 = await 새계정(admin, 'zqa118');
    });

    await test.step('로그인한 계정이 있는지 확인한다', async () => {
      const 응답 = await admin.get('/characters', { headers: { authorization: `Bearer ${주인!.토큰}` } });
      await verify('로그인한 계정이 있다', 응답.status(), 200, { blocker: true });
    });

    await test.step('새 캐릭터를 만들고 가방을 읽는다', async () => {
      const 만든 = await 캐릭터더하기(admin, 주인!);
      const 개수 = (await 가방(admin, 만든)).items.filter((x) => x.templateId === 'potion_hp_s').reduce((합, x) => 합 + x.quantity, 0);
      await verify('새 캐릭터를 만들면 가방에 빨간 물약이 10개 있다', 개수, 10);
    });
  } finally {
    if (주인 !== undefined) await 계정지우기(admin, 주인);
  }
});
