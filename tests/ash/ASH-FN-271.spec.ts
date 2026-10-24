import { defineCase, test, verify } from '@platform/kit';

import { 바닥아이템만들기, 계정지우기, 고정비우기, 줍기, 응답몸, type 바닥아이템정보, type 봇정보, type 캐릭터 } from './helpers/game-state.helper.js';
import { 바닥아이템목록, 봇찾기, 산봇하나 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-271',
  name: '봇이 바닥 아이템을 주우면 줍은 이가 「Bot」이고 그 봇의 아이템 수가 1 는다',
  platforms: ['android'],
  precondition: ['초록 들판 바닥에 아이템이 있고 살아 있는 초록 들판 봇이 있다'],
  elements: ['zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 떨군이: 캐릭터 | undefined;
  let 바닥: 바닥아이템정보 | undefined;
  let 봇: 봇정보 | undefined;
  let 앞수 = 0;
  try {
    await test.step('초록 들판 바닥에 아이템을 두고 살아 있는 초록 들판 봇을 고른다', async () => {
      await 고정비우기(admin);
      const 만든 = await 바닥아이템만들기(admin, 'zqa271');
      떨군이 = 만든.떨군이;
      바닥 = 만든.바닥;
      봇 = await 산봇하나(admin, 떨군이, 'Beginner');
    });

    await test.step('바닥 아이템과 봇이 있는지 확인한다', async () => {
      const 목록 = await 바닥아이템목록(admin, 떨군이!, 'Beginner');
      await verify('초록 들판 바닥에 아이템이 있다', 목록.some((x) => x.id === 바닥!.id), true, { blocker: true });
      const 지금 = await 봇찾기(admin, 떨군이!, 봇!.id);
      await verify('살아 있는 초록 들판 봇이 있다', 지금 !== undefined && !지금.isDead && 지금.zone === 'Beginner', true, { blocker: true });
      앞수 = 지금?.itemCount ?? 0;
    });

    await test.step('봇이 그 바닥 아이템을 줍게 한다', async () => {
      const 응답 = await 줍기(admin, 떨군이!, 바닥!.id, 봇!.id, { x: 바닥!.x, z: 바닥!.z });
      await verify('줍기 응답이 200 이다', 응답.status(), 200);
      const 몸 = await 응답몸<{ pickedByKind: string }>(응답);
      const 줍은이 = await verify('줍은 이가 「Bot」이다', 몸.pickedByKind, 'Bot');
      const 뒤수 = (await 봇찾기(admin, 떨군이!, 봇!.id))?.itemCount ?? 0;
      const 늘어남 = await verify('그 봇의 아이템 수가 1 는다', 뒤수 - 앞수, 1);
      await verify('봇이 바닥 아이템을 주우면 줍은 이가 「Bot」이고 그 봇의 아이템 수가 1 는다', 줍은이 && 늘어남, true);
    });
  } finally {
    if (떨군이 !== undefined) await 계정지우기(admin, 떨군이);
  }
});
