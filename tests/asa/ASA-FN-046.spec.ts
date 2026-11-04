import { defineCase, test, verify } from '@platform/kit';

import { 값읽기, 부르기, 플레이어만들기, type 캐릭터, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-046',
  name: '캐릭터 목록을 불러오면 「classType」이 「Warrior」 같은 글자로 온다',
  apiDoc: 1,
  precondition: ['캐릭터가 하나 있다'],
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

  await test.step('캐릭터 목록을 불러 「classType」을 읽는다', async () => {
    const 목록 = await 값읽기<Array<Pick<캐릭터, 'id' | 'classType'>>>(await 부르기(request, 'GET', '/characters', { 토큰: 나.토큰 }));
    const 내캐릭터 = 목록.find((c) => c.id === 나.캐릭터번호);
    await verify('캐릭터 목록을 불러오면 「classType」이 「Warrior」 같은 글자로 온다', 내캐릭터?.classType, 'Warrior');
  });
});
