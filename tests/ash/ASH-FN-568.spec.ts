import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 고정비우기, 바닥아이템만들기, 월드다시두기, type 바닥아이템정보, type 캐릭터 } from './helpers/game-state.helper.js';
import { 바닥목록 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-568',
  name: '월드를 다시 시드하면 바닥 아이템이 지워지고 botCount 가 20 이다',
  platforms: ['android'],
  precondition: ['초록 들판 바닥에 아이템이 있다'],
  elements: ['zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 떨군이: 캐릭터 | undefined;
  let 바닥: 바닥아이템정보 | undefined;
  try {
    await test.step('초록 들판 바닥에 아이템을 떨어뜨린다', async () => {
      await 고정비우기(admin);
      const 만듦 = await 바닥아이템만들기(admin, 'zqa568');
      떨군이 = 만듦.떨군이;
      바닥 = 만듦.바닥;
    });

    await test.step('초록 들판 바닥에 그 아이템이 있는지 확인한다', async () => {
      const 목록 = await 바닥목록(admin, 떨군이!, 'Beginner');
      await verify('초록 들판 바닥에 떨어뜨린 아이템이 있다', 목록.some((x) => x.id === 바닥!.id), true, { blocker: true });
    });

    await test.step('월드를 다시 시드한다', async () => {
      const 결과 = await 월드다시두기(admin);
      const 지움 = await verify('지워진 바닥 아이템이 한 개 이상이다', 결과.groundItemsDeleted >= 1, true);
      const 없음 = await verify('초록 들판 바닥에 떨어뜨린 아이템이 없다', (await 바닥목록(admin, 떨군이!, 'Beginner')).some((x) => x.id === 바닥!.id), false);
      const 수 = await verify('botCount 가 20 이다', 결과.botCount, 20);
      await verify('월드를 다시 시드하면 바닥 아이템이 지워지고 botCount 가 20 이다', 지움 && 없음 && 수, true);
    });
  } finally {
    await 고정비우기(admin);
    if (떨군이 !== undefined) await 계정지우기(admin, 떨군이);
  }
});
