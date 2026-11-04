import { defineCase, test, verify } from '@platform/kit';

import { GM레벨, 캐릭터읽기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-127',
  name: '1레벨 캐릭터의 「expToNext」가 100 이다',
  apiDoc: 1,
  precondition: ['1레벨 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('1레벨 캐릭터가 있는지 확인한다', async () => {
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('캐릭터가 1레벨이다', (await 캐릭터읽기(request, 나)).level, 1, { blocker: true });
  });

  await test.step('캐릭터의 「expToNext」를 읽는다', async () => {
    await verify('1레벨 캐릭터의 「expToNext」가 100 이다', (await 캐릭터읽기(request, 나)).expToNext, 100);
  });

  await test.step('GM 으로 2레벨로 올린다', async () => {
    await GM레벨(request, 나, 2);
    await verify('2레벨로 올리면 「expToNext」가 300 이다', (await 캐릭터읽기(request, 나)).expToNext, 300);
  });

  await test.step('GM 으로 10레벨로 올린다', async () => {
    await GM레벨(request, 나, 10);
    await verify('10레벨로 올리면 「expToNext」가 5500 이다', (await 캐릭터읽기(request, 나)).expToNext, 5500);
  });
});
