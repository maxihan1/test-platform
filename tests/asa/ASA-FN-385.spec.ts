import { defineCase, test, verify } from '@platform/kit';

import { 봇목록 } from './helpers/combat.helper.js';
import { 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-385',
  name: '구역 없이 봇 목록을 부르면 세 사냥터 봇 수를 더한 만큼 온다',
  apiDoc: 2,
  precondition: ['로그인한 캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 세사냥터합 = 0;

  await test.step('일회용 계정으로 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('캐릭터가 만들어졌는지 확인한다', async () => {
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('세 사냥터 봇 목록을 각각 부른다', async () => {
    const 초록 = await 봇목록(request, 나, 'Beginner');
    const 잿빛 = await 봇목록(request, 나, 'Intermediate');
    const 폐허 = await 봇목록(request, 나, 'Boss');
    세사냥터합 = 초록.length + 잿빛.length + 폐허.length;
    await verify('세 사냥터에 봇이 있다', 세사냥터합 > 0, true, {
      blocker: true,
    });
  });

  await test.step('구역 없이 봇 목록을 부른다', async () => {
    const 전체 = await 봇목록(request, 나);
    await verify('구역 없이 봇 목록을 부르면 세 사냥터 봇 수를 더한 만큼 온다', 전체.length, 세사냥터합);
  });
});
