import { defineCase, test, verify } from '@platform/kit';

import { PK기록, 값읽기, 플레이어만들기, type 성향, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-274',
  name: '새 캐릭터의 PK 기록을 부르면 성향치가 0 이다',
  apiDoc: 2,
  precondition: ['새 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 새 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('새 캐릭터가 만들어졌는지 확인한다', async () => {
    await verify('새 캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('PK 기록을 부른다', async () => {
    const 값 = await 값읽기<{ alignment?: Partial<성향> }>(await PK기록(request, 나));
    await verify('새 캐릭터의 PK 기록을 부르면 성향치가 0 이다', 값.alignment?.value, 0);
  });
});
