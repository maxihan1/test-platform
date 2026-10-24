import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 결과고정비우기, 드랍확률되돌리기, 새캐릭터, 성향주기, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 구간확률바꾸기, 구간확률읽기, 죽어서떨군수 } from './helpers/loot.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-260',
  name: '성향치 −700 구간 사망 드랍 확률을 100% 로 바꾸고 5번 죽으면 5번 다 떨어뜨린다',
  platforms: ['android'],
  precondition: ['성향치 −700 인 새 전사 캐릭터가 초록 들판에 있고 그 구간 사망 드랍 확률이 100% 다', '성향치 −700 인 새 전사 캐릭터가 초록 들판에 있고 그 구간 사망 드랍 확률이 0% 다'],
  techniques: ['경계값 분석'],
  elements: ['zone:Beginner', 'drop:death_-600이하', 'state:생존=죽음'],
  params: z.object({
    횟수: z.number().int().describe('죽는 횟수 — 1 이상').default(5),
  }),
  expected: null,
});

test(spec, async ({ admin, request, params }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('성향치 −700 인 새 전사 캐릭터를 초록 들판에 만든다', async () => {
      await 결과고정비우기(admin);
      await 드랍확률되돌리기(admin);
      const 나 = await 새캐릭터(admin, 'qafn260');
      누구 = 나;
      await 성향주기(admin, 나, -700);
      await 순간이동(admin, 나, 'Beginner');
      await 구간확률바꾸기(admin, -700, 1);
    });
    await test.step('캐릭터가 성향치 −700 으로 초록 들판에 있고 그 구간 사망 드랍 확률이 100% 인지 확인한다', async () => {
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
      await verify('캐릭터의 성향치가 −700 이다', 정보.alignment.value, -700, { blocker: true });
      await verify('성향치 −700 구간 사망 드랍 확률이 100% 다', await 구간확률읽기(admin, -700), 1, { blocker: true });
    });
    await test.step('몬스터에게 죽었다고 5번 보고한다', async () => {
      const 모두 = await 죽어서떨군수(request, admin, 누구!, params.횟수);
      await verify('성향치 −700 구간 사망 드랍 확률을 100% 로 바꾸고 5번 죽으면 5번 다 떨어뜨린다', 모두, params.횟수);
      await 구간확률바꾸기(admin, -700, 0);
      await verify('성향치 −700 구간 사망 드랍 확률이 0% 다', await 구간확률읽기(admin, -700), 0, { blocker: true });
      const 없음 = await 죽어서떨군수(request, admin, 누구!, params.횟수);
      await verify('성향치 −700 구간 사망 드랍 확률을 0% 로 바꾸고 5번 죽으면 한 번도 떨어뜨리지 않는다', 없음, 0);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
    await 드랍확률되돌리기(admin);
    await 결과고정비우기(admin);
  }
});
