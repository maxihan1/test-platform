import { defineCase, test, verify } from '@platform/kit';

import { 개수, type 바닥아이템, 본문, type 캐릭터 } from './helpers/api.helper.js';
import { 가방읽기, 결과고정비우기, 바닥아이템남기기, 새캐릭터, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 바닥아이템찾기, 줍기 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-268',
  name: '다른 캐릭터가 떨어뜨린 바닥 아이템을 주우면 내 가방에 들어온다',
  platforms: ['android'],
  precondition: ['다른 캐릭터가 초록 들판에서 죽어 바닥 아이템을 남겼다'],
  elements: ['zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 바닥: 바닥아이템 | undefined;
  let 줍는이: 캐릭터 | undefined;
  let 떨군: 캐릭터 | undefined;
  try {
    await test.step('다른 캐릭터가 초록 들판에서 죽어 바닥 아이템을 남기게 한다', async () => {
      await 결과고정비우기(admin);
      const 남김 = await 바닥아이템남기기(admin, 'qafn268');
      떨군 = 남김.떨군;
      바닥 = 남김.아이템;
    });
    await test.step('줍는 새 전사 캐릭터를 초록 들판에 만든다', async () => {
      const 나 = await 새캐릭터(admin, 'qafn268');
      줍는이 = 나;
      await 순간이동(admin, 나, 'Beginner');
    });
    await test.step('바닥 아이템이 초록 들판에 남아 있는지 확인한다', async () => {
      await verify('다른 캐릭터가 남긴 바닥 아이템이 초록 들판에 있다', (await 바닥아이템찾기(request, 줍는이!, 'Beginner', 바닥!.id)) !== undefined, true, { blocker: true });
    });
    await test.step('새 캐릭터가 그 바닥 아이템을 줍는다', async () => {
      const 전 = 개수(await 가방읽기(admin, 줍는이!), 바닥!.templateId);
      await 본문(await 줍기(request, 줍는이!, 바닥!), '줍기');
      const 후 = 개수(await 가방읽기(admin, 줍는이!), 바닥!.templateId);
      await verify('다른 캐릭터가 떨어뜨린 바닥 아이템을 주우면 내 가방에 들어온다', 후 - 전, 바닥!.quantity);
    });
  } finally {
    if (줍는이 !== undefined) await 캐릭터지우기(admin, 줍는이);
    if (떨군 !== undefined) await 캐릭터지우기(admin, 떨군);
    await 결과고정비우기(admin);
  }
});
