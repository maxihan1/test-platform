import { defineCase, test, verify } from '@platform/kit';

import { 무작위글자 } from './helpers/api.helper.js';
import { 몬스터처치, 스폰고르기 } from './helpers/combat.helper.js';
import { 오류코드읽기, 플레이어만들기, type 스폰, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-159',
  name: '스폰 표에 없는 스폰 번호로 처치를 알리면 「INVALID_SPAWN」으로 막힌다',
  apiDoc: 1,
  techniques: ['동등 분할'],
  precondition: ['캐릭터가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 자리: 스폰 | undefined;

  await test.step('일회용 계정으로 캐릭터를 만들고 임프 스폰을 고른다', async () => {
    나 = await 플레이어만들기(request);
    자리 = (await 스폰고르기(request, 나, 'Imp'))[0];
  });

  await test.step('캐릭터와 임프 스폰이 있는지 확인한다', async () => {
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('고를 임프 스폰이 있다', 자리 !== undefined, true, {
      blocker: true,
    });
  });

  await test.step('스폰 표에 없는 스폰 번호로 임프 처치를 알린다', async () => {
    if (자리 === undefined) return;
    const 없는자리: 스폰 = { ...자리, id: `none-${무작위글자(8)}` };
    const 응답 = await 몬스터처치(request, 나, 없는자리);
    await verify('스폰 표에 없는 스폰 번호로 처치를 알리면 「INVALID_SPAWN」으로 막힌다', await 오류코드읽기(응답), 'INVALID_SPAWN');
  });

  await test.step('임프 스폰 번호에 반달 임프로 처치를 알린다', async () => {
    if (자리 === undefined) return;
    const 응답 = await 몬스터처치(request, 나, 자리, 'VandalImp');
    await verify('스폰의 몬스터와 다른 몬스터로 처치를 알리면 「INVALID_SPAWN」으로 막힌다', await 오류코드읽기(응답), 'INVALID_SPAWN');
  });
});
