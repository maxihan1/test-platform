import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 고정비우기, 드랍확률되돌리기, 드랍확률바꾸기, 바꾸기, 사망되풀이, 새캐릭터, 순간이동, 어드민설정, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-257',
  name: '성향치 −400 구간 사망 드랍 확률을 100% 로 바꾸고 사망하면 매번 아이템이 떨어진다',
  platforms: ['android'],
  precondition: ['성향치 −400 인 새 캐릭터가 빨간 물약을 가지고 있다'],
  techniques: ['경계값 분석'],
  elements: ['drop:death_-300~-599', 'item:potion_hp_s', 'state:생존=죽음'],
  params: z.object({
    횟수: z.number().int().min(1).describe('확률마다 사망 보고 횟수 — 1 이상').default(5),
  }),
  expected: null,
});

type 드랍줄 = { maxAlignment: number; chance: number; includeEquipped: boolean };

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  let 기본: 드랍줄[] = [];
  const 구간 = (): 드랍줄 | undefined => [...기본].sort((x, y) => x.maxAlignment - y.maxAlignment).find((x) => x.maxAlignment >= -400);
  const 바꾼표 = (확률: number): 드랍줄[] => 기본.map((x) => (x === 구간() ? { ...x, chance: 확률 } : x));
  try {
    await test.step('성향치 −400 인 새 캐릭터를 만들고 드랍 설정을 기본으로 되돌린다', async () => {
      나 = await 새캐릭터(admin, 'zqa257');
      await 고정비우기(admin);
      await 드랍확률되돌리기(admin);
      await 순간이동(admin, 나, 'Beginner');
      await 바꾸기(admin, 나, { alignment: -400 });
    });

    await test.step('성향치 −400 구간의 사망 드랍 줄을 확인한다', async () => {
      기본 = (await 어드민설정(admin)).drop.deathDrop;
      await verify('설정의 성향치 −400 구간 사망 드랍 확률이 50% 다', 구간()?.chance, 0.5, { blocker: true });
    });

    await test.step('성향치 −400 구간의 사망 드랍 확률을 100% 로 바꾸고 정해 둔 횟수만큼 사망한다', async () => {
      await 드랍확률바꾸기(admin, { deathDrop: 바꾼표(1) });
      const 셈 = await 사망되풀이(admin, 나!, params.횟수);
      await verify('성향치 −400 구간 사망 드랍 확률을 100% 로 바꾸고 사망하면 매번 아이템이 떨어진다', 셈.떨어짐, params.횟수);
    });

    await test.step('성향치 −400 구간의 사망 드랍 확률을 0% 로 바꾸고 정해 둔 횟수만큼 사망한다', async () => {
      await 드랍확률바꾸기(admin, { deathDrop: 바꾼표(0) });
      const 셈 = await 사망되풀이(admin, 나!, params.횟수);
      await verify('성향치 −400 구간 사망 드랍 확률을 0% 로 바꾸고 사망하면 한 번도 아이템이 떨어지지 않는다', 셈.떨어짐, 0);
    });
  } finally {
    await 드랍확률되돌리기(admin);
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
