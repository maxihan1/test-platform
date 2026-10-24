import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 고정비우기, 바닥아이템만들기, 새캐릭터, 순간이동, 줍기, type 바닥아이템정보, type 캐릭터 } from './helpers/game-state.helper.js';
import { 바닥목록 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-451',
  name: '만료 전의 바닥 아이템을 주우면 200 이다',
  platforms: ['android'],
  precondition: ['사망 드랍으로 떨어진 바닥 아이템이 있다'],
  elements: ['zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 떨군이: 캐릭터 | undefined;
  let 줍는이: 캐릭터 | undefined;
  let 바닥: 바닥아이템정보 | undefined;
  try {
    await test.step('사망 드랍으로 떨어진 바닥 아이템을 만든다', async () => {
      await 고정비우기(admin);
      const 만듦 = await 바닥아이템만들기(admin, 'zqa451');
      떨군이 = 만듦.떨군이;
      바닥 = 만듦.바닥;
      줍는이 = await 새캐릭터(admin, 'zqa451');
      await 순간이동(admin, 줍는이, 'Beginner');
    });

    await test.step('초록 들판 바닥에 그 아이템이 있는지 확인한다', async () => {
      const 목록 = await 바닥목록(admin, 줍는이!, 'Beginner');
      await verify('초록 들판 바닥에 사망 드랍 아이템이 있다', 목록.some((x) => x.id === 바닥!.id), true, { blocker: true });
    });

    await test.step('만료 전에 그 바닥 아이템을 줍는다', async () => {
      const 응답 = await 줍기(admin, 줍는이!, 바닥!.id);
      await verify('만료 전의 바닥 아이템을 주우면 200 이다', 응답.status(), 200);
    });
  } finally {
    await 고정비우기(admin);
    if (떨군이 !== undefined) await 계정지우기(admin, 떨군이);
    if (줍는이 !== undefined) await 계정지우기(admin, 줍는이);
  }
});
