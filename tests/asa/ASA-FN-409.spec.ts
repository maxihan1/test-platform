import { defineCase, test, verify } from '@platform/kit';

import { 캐릭터읽기, 위치옮기기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-409',
  name: '위치를 저장하면 다시 불러온 캐릭터 위치가 저장한 좌표다',
  apiDoc: 1,
  precondition: ['로그인한 캐릭터가 있다'],
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

  await test.step('위치를 (120, 150) 으로 저장한 뒤 캐릭터를 다시 부른다', async () => {
    await 위치옮기기(request, 나, 120, 150);
    const 지금 = await 캐릭터읽기(request, 나);
    const 가로 = await verify('다시 불러온 캐릭터 위치의 X 가 120 이다', 지금.position.x, 120);
    const 세로 = await verify('다시 불러온 캐릭터 위치의 Z 가 150 이다', 지금.position.z, 150);
    await verify('위치를 저장하면 다시 불러온 캐릭터 위치가 저장한 좌표다', 가로 && 세로, true);
  });
});
