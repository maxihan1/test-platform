import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 새아이템주기, 새캐릭터, 아이템지우기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-538',
  name: '어드민에서 가죽 투구를 지우면 가방에 가죽 투구가 없다',
  platforms: ['android'],
  precondition: ['가죽 투구를 가진 새 캐릭터가 있다'],
  elements: ['item:helm_leather'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 투구 = 0;
  try {
    await test.step('가죽 투구를 가진 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa538');
      투구 = (await 새아이템주기(admin, 나, 'helm_leather')).id;
    });

    await test.step('가방에 가죽 투구가 있는지 확인한다', async () => {
      const 있음 = (await 가방(admin, 나!)).items.some((x) => x.templateId === 'helm_leather');
      await verify('가방에 가죽 투구가 있다', 있음, true, { blocker: true });
    });

    await test.step('어드민에서 가죽 투구를 지운다', async () => {
      await 아이템지우기(admin, 나!, 투구);
      const 남음 = (await 가방(admin, 나!)).items.some((x) => x.templateId === 'helm_leather');
      await verify('어드민에서 가죽 투구를 지우면 가방에 가죽 투구가 없다', 남음, false);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
