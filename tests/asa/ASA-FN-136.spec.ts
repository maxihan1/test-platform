import { defineCase, test, verify } from '@platform/kit';

import { 사망알리기 } from './helpers/combat.helper.js';
import { GM레벨, 값읽기, 캐릭터읽기, 플레이어만들기, type 캐릭터, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-136',
  name: '2레벨 캐릭터가 죽어도 레벨은 2 다',
  apiDoc: 1,
  precondition: ['2레벨 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 캐릭터를 만들고 2레벨로 올린다', async () => {
    나 = await 플레이어만들기(request);
    await GM레벨(request, 나, 2);
  });

  await test.step('2레벨 캐릭터인지 확인한다', async () => {
    const 지금 = await 캐릭터읽기(request, 나);
    await verify('캐릭터 레벨이 2 다', 지금.level, 2, { blocker: true });
  });

  await test.step('사망을 알린다', async () => {
    const 죽음 = await 값읽기<{ character?: Partial<캐릭터> }>(await 사망알리기(request, 나));
    await verify('2레벨 캐릭터가 죽어도 레벨은 2 다', 죽음.character?.level, 2);
  });
});
