import { defineCase, test, verify } from '@platform/kit';

import { 가방, 강화하기, 계정지우기, 새아이템주기, 새캐릭터, type 캐릭터 } from './helpers/game-state.helper.js';
import { 강화기록 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-523',
  name: '어드민 강화 기록에 fromLevel 0 · toLevel 1 · result 「Success」 줄이 있다',
  platforms: ['android'],
  precondition: ['짧은 검을 한 번 강화한 새 캐릭터가 있다'],
  elements: ['item:scroll_weapon', 'item:sword_short'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 검 = 0;
  try {
    await test.step('짧은 검을 한 번 강화한 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa523');
      검 = (await 새아이템주기(admin, 나, 'sword_short')).id;
      const 주문서 = (await 새아이템주기(admin, 나, 'scroll_weapon')).id;
      await 강화하기(admin, 나, 검, 주문서);
    });

    await test.step('짧은 검이 +1 이 됐는지 확인한다', async () => {
      const 그검 = (await 가방(admin, 나!)).items.find((x) => x.id === 검);
      await verify('짧은 검이 +1 이다', 그검?.enhanceLevel, 1, { blocker: true });
    });

    await test.step('어드민에서 강화 기록을 읽는다', async () => {
      const 기록 = await 강화기록(admin, 나!);
      await verify(
        '어드민 강화 기록에 fromLevel 0 · toLevel 1 · result 「Success」 줄이 있다',
        기록.some((x) => x.fromLevel === 0 && x.toLevel === 1 && x.result === 'Success'),
        true,
      );
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
