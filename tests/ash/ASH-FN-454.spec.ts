import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 고정비우기, 바닥아이템만들기, type 바닥아이템정보, type 캐릭터 } from './helpers/game-state.helper.js';
import { 바닥목록 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-454',
  name: '바닥 아이템 목록의 만료 시각이 모두 지금보다 뒤다',
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
      const 만듦 = await 바닥아이템만들기(admin, 'zqa454');
      떨군이 = 만듦.떨군이;
      바닥 = 만듦.바닥;
    });

    await test.step('초록 들판 바닥에 그 아이템이 있는지 확인한다', async () => {
      const 목록 = await 바닥목록(admin, 떨군이!, 'Beginner');
      await verify('초록 들판 바닥에 떨어뜨린 아이템이 있다', 목록.some((x) => x.id === 바닥!.id), true, { blocker: true });
    });

    await test.step('초록 들판 바닥 아이템 목록을 부른다', async () => {
      const 목록 = await 바닥목록(admin, 떨군이!, 'Beginner');
      const 지난것 = 목록.filter((x) => Date.parse(x.expiresAt) <= Date.now()).map((x) => String(x.id)).join(', ');
      await verify('바닥 아이템 목록의 만료 시각이 모두 지금보다 뒤다', 지난것, '');
    });
  } finally {
    await 고정비우기(admin);
    if (떨군이 !== undefined) await 계정지우기(admin, 떨군이);
  }
});
