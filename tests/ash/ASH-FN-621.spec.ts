import { defineCase, test, verify } from '@platform/kit';

import {
  계정지우기,
  고정비우기,
  바닥아이템만들기,
  새캐릭터,
  순간이동,
  어드민설정,
  오류코드,
  줍기,
  될때까지,
  type 바닥아이템정보,
  type 캐릭터,
} from './helpers/game-state.helper.js';
import { 바닥목록 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-621',
  name: '만료된 바닥 아이템을 주우려 하면 409 「ITEM_EXPIRED」다',
  platforms: ['android'],
  precondition: ['사망 드랍으로 떨어진 바닥 아이템이 있다'],
  techniques: ['동등 분할'],
  elements: ['zone:Beginner'],
  held: '보류 — 만료 180초가 케이스 시간 한도 120초보다 김',
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
      const 만듦 = await 바닥아이템만들기(admin, 'zqa621');
      떨군이 = 만듦.떨군이;
      바닥 = 만듦.바닥;
      줍는이 = await 새캐릭터(admin, 'zqa621');
      await 순간이동(admin, 줍는이, 'Beginner');
    });

    await test.step('초록 들판 바닥에 그 아이템이 있는지 확인한다', async () => {
      const 목록 = await 바닥목록(admin, 줍는이!, 'Beginner');
      await verify('초록 들판 바닥에 사망 드랍 아이템이 있다', 목록.some((x) => x.id === 바닥!.id), true, { blocker: true });
    });

    await test.step('180초가 지난 뒤 그 바닥 아이템을 줍는다', async () => {
      const 수명 = (await 어드민설정(admin)).drop.groundItemLifetimeSeconds;
      await 될때까지(async () => ((await 바닥목록(admin, 줍는이!, 'Beginner')).some((x) => x.id === 바닥!.id) ? undefined : true), (수명 + 30) * 1000, 5000);
      const 응답 = await 줍기(admin, 줍는이!, 바닥!.id);
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('오류 코드가 「ITEM_EXPIRED」다', await 오류코드(응답), 'ITEM_EXPIRED');
      await verify('만료된 바닥 아이템을 주우려 하면 409 「ITEM_EXPIRED」다', 코드 && 이름, true);
    });
  } finally {
    await 고정비우기(admin);
    if (떨군이 !== undefined) await 계정지우기(admin, 떨군이);
    if (줍는이 !== undefined) await 계정지우기(admin, 줍는이);
  }
});
