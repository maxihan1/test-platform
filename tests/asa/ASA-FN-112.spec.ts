import { defineCase, test, verify } from '@platform/kit';

import { 캐릭터읽기, 위치옮기기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-112',
  name: '마을이면서 Z 가 200 보다 작은 (200, 50) 으로 옮기면 구역이 「Town」이다',
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

  await test.step('위치를 (100, 150) 으로 옮긴다', async () => {
    await 위치옮기기(request, 나, 100, 150);
    const 지금 = await 캐릭터읽기(request, 나);
    await verify('마을 밖 Z 199 아래인 (100, 150) 으로 옮기면 구역이 「Beginner」다', 지금.zone, 'Beginner');
  });

  await test.step('위치를 (100, 250) 으로 옮긴다', async () => {
    await 위치옮기기(request, 나, 100, 250);
    const 지금 = await 캐릭터읽기(request, 나);
    await verify('보스 지역 밖 Z 200 이상인 (100, 250) 으로 옮기면 구역이 「Intermediate」다', 지금.zone, 'Intermediate');
  });

  await test.step('위치를 (200, 350) 으로 옮긴다', async () => {
    await 위치옮기기(request, 나, 200, 350);
    const 지금 = await 캐릭터읽기(request, 나);
    await verify('보스 지역이면서 Z 가 200 이상인 (200, 350) 으로 옮기면 구역이 「Boss」다', 지금.zone, 'Boss');
  });

  await test.step('위치를 (200, 50) 으로 옮긴다', async () => {
    await 위치옮기기(request, 나, 200, 50);
    const 지금 = await 캐릭터읽기(request, 나);
    await verify('마을이면서 Z 가 200 보다 작은 (200, 50) 으로 옮기면 구역이 「Town」이다', 지금.zone, 'Town');
  });
});
