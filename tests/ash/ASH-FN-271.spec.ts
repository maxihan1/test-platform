import { defineCase, test, verify } from '@platform/kit';

import { type 계정, type 바닥아이템, 본문, type 봇, 새계정, type 캐릭터 } from './helpers/api.helper.js';
import { 결과고정비우기, 바닥아이템남기기, 봇읽기, 살아있는봇, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 바닥아이템찾기, 줍기, type 줍기결과 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-271',
  name: '봇이 바닥 아이템을 주우면 pickedByKind 가 「Bot」이고 봇의 아이템 수가 1 는다',
  platforms: ['android'],
  precondition: ['캐릭터가 초록 들판에서 죽어 바닥 아이템을 남겼다'],
  elements: ['zone:Beginner'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 바닥: 바닥아이템 | undefined;
  let 봇값: 봇 | undefined;
  let 관찰: 계정 | undefined;
  let 떨군: 캐릭터 | undefined;
  try {
    await test.step('초록 들판 봇을 고른다', async () => {
      관찰 = await 새계정(admin, 'qafn271');
      봇값 = await 살아있는봇(admin, 관찰, 'Beginner');
    });
    await test.step('캐릭터가 초록 들판에서 죽어 바닥 아이템을 남기게 한다', async () => {
      await 결과고정비우기(admin);
      const 남김 = await 바닥아이템남기기(admin, 'qafn271');
      떨군 = 남김.떨군;
      바닥 = 남김.아이템;
    });
    await test.step('바닥 아이템이 초록 들판에 남아 있는지 확인한다', async () => {
      await verify('죽은 캐릭터가 남긴 바닥 아이템이 초록 들판에 있다', (await 바닥아이템찾기(request, 떨군!, 'Beginner', 바닥!.id)) !== undefined, true, { blocker: true });
    });
    await test.step('초록 들판 봇이 그 바닥 아이템을 줍게 한다', async () => {
      const 전 = (await 봇읽기(admin, 떨군!, 봇값!.id)).itemCount;
      const 줍기값 = await 본문<줍기결과>(await 줍기(request, 떨군!, 바닥!, 봇값!.id), '봇 줍기');
      const 후 = (await 봇읽기(admin, 떨군!, 봇값!.id)).itemCount;
      const 봇이다 = await verify('pickedByKind 가 「Bot」이다', 줍기값.pickedByKind, 'Bot');
      const 하나늘다 = await verify('봇의 아이템 수가 1 는다', 후 - 전, 1);
      await verify('봇이 바닥 아이템을 주우면 pickedByKind 가 「Bot」이고 봇의 아이템 수가 1 는다', 봇이다 && 하나늘다, true);
    });
  } finally {
    if (관찰 !== undefined) await 캐릭터지우기(admin, 관찰);
    if (떨군 !== undefined) await 캐릭터지우기(admin, 떨군);
    await 결과고정비우기(admin);
  }
});
