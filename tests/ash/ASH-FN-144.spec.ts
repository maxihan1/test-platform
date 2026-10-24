import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, type 바닥아이템, type 캐릭터 } from './helpers/api.helper.js';
import { 가방읽기, 가방채우기, 결과고정비우기, 바닥아이템남기기, 새캐릭터, 순간이동, 아이템지우기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 땅아이템목록, 땅아이템줍기, 오류코드 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-144',
  name: '가방이 꽉 찬 캐릭터가 바닥 아이템을 주우면 409 「INVENTORY_FULL」이고 아이템이 바닥에 남는다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터의 가방이 40칸 꽉 차 있고 발밑에 바닥 아이템이 있다'],
  elements: ['zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 줍는이: 캐릭터 | undefined;
  let 떨군이: 캐릭터 | undefined;
  let 땅: 바닥아이템 | undefined;
  try {
    await test.step('가방이 꽉 찬 새 전사 캐릭터를 만들고 발밑에 바닥 아이템을 남긴다', async () => {
      await 결과고정비우기(admin);
      const 남김 = await 바닥아이템남기기(admin, 'qafn144');
      떨군이 = 남김.떨군;
      땅 = 남김.아이템;
      줍는이 = await 새캐릭터(admin, 'qafn144');
      await 순간이동(admin, 줍는이, { x: 땅.x, z: 땅.z });
      const 같은것 = (await 가방읽기(admin, 줍는이)).items.find((i) => i.templateId === 땅!.templateId);
      if (같은것 !== undefined) await 아이템지우기(admin, 줍는이, 같은것.id);
      await 가방채우기(admin, 줍는이, 0);
    });
    await test.step('가방이 40칸 꽉 차 있고 발밑에 바닥 아이템이 있는지 확인한다', async () => {
      await verify('가방 사용 칸이 40 이다', (await 가방받기(request, 줍는이!)).used, 40, { blocker: true });
      const 목록 = await 땅아이템목록(request, 줍는이!, 땅!.zone);
      await verify('바닥 아이템 목록에 발밑 아이템이 하나 있다', 목록.filter((g) => g.id === 땅!.id).length, 1, { blocker: true });
    });
    await test.step('바닥 아이템을 줍는다', async () => {
      const 응답 = await 땅아이템줍기(request, 줍는이!, 땅!.id, { x: 땅!.x, z: 땅!.z });
      const 상태 = await verify('줍기 응답 코드가 409 이다', 응답.status(), 409);
      const 코드 = await verify('줍기 오류 코드가 「INVENTORY_FULL」이다', await 오류코드(응답), 'INVENTORY_FULL');
      const 목록 = await 땅아이템목록(request, 줍는이!, 땅!.zone);
      const 남음 = await verify('줍지 못한 아이템이 바닥 아이템 목록에 남아 있다', 목록.filter((g) => g.id === 땅!.id).length, 1);
      await verify('가방이 꽉 찬 캐릭터가 바닥 아이템을 주우면 409 「INVENTORY_FULL」이고 아이템이 바닥에 남는다', 상태 && 코드 && 남음, true);
    });
  } finally {
    await 결과고정비우기(admin);
    if (줍는이 !== undefined) await 캐릭터지우기(admin, 줍는이);
    if (떨군이 !== undefined) await 캐릭터지우기(admin, 떨군이);
  }
});
