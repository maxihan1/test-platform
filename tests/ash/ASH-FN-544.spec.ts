import { defineCase, test, verify } from '@platform/kit';

import { 결과고정, 고정목록, 고정비우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-544',
  name: '강화 결과를 고정하면 고정 목록에 「Fail」이 보이고 비우면 목록이 빈다',
  platforms: ['android'],
  precondition: ['고정된 결과가 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  try {
    await test.step('고정된 결과를 모두 비운다', async () => {
      await 고정비우기(admin);
    });

    await test.step('고정된 결과가 없는지 확인한다', async () => {
      const 목록 = await 고정목록(admin);
      await verify('고정된 결과가 하나도 없다', 목록.enhance.length + 목록.botLoot.length + 목록.deathDrop.length, 0, { blocker: true });
    });

    await test.step('강화 결과 실패를 고정하고 고정 목록을 읽은 뒤 비운다', async () => {
      await 결과고정(admin, { enhance: ['Fail'] });
      const 고정함 = await verify('고정 목록의 강화 줄이 「Fail」이다', (await 고정목록(admin)).enhance.join(', '), 'Fail');
      await 고정비우기(admin);
      const 비운 = await 고정목록(admin);
      const 빔 = await verify('비운 뒤 고정 목록이 비어 있다', 비운.enhance.length + 비운.botLoot.length + 비운.deathDrop.length, 0);
      await verify('강화 결과를 고정하면 고정 목록에 「Fail」이 보이고 비우면 목록이 빈다', 고정함 && 빔, true);
    });
  } finally {
    await 고정비우기(admin);
  }
});
