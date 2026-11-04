import { defineCase, test, verify } from '@platform/kit';

import { GM성향, 캐릭터읽기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-271',
  name: 'GM 으로 성향치를 −1000 으로 바꾸면 성향치가 −1000 이다',
  apiDoc: 2,
  precondition: ['캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('캐릭터가 만들어졌는지 확인한다', async () => {
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('GM 으로 성향치를 −1000 으로 바꾼다', async () => {
    await GM성향(request, 나, -1000);
    const 지금 = await 캐릭터읽기(request, 나);
    await verify('GM 으로 성향치를 −1000 으로 바꾸면 성향치가 −1000 이다', 지금.alignment.value, -1000);
  });

  await test.step('GM 으로 성향치를 1000 으로 바꾼다', async () => {
    await GM성향(request, 나, 1000);
    const 지금 = await 캐릭터읽기(request, 나);
    await verify('GM 으로 성향치를 1000 으로 바꾸면 성향치가 1000 이다', 지금.alignment.value, 1000);
  });
});
