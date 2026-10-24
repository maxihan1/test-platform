import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 새캐릭터, 순간이동, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-017',
  name: 'X 100, Z 199 로 옮기면 캐릭터 구역이 「Beginner」다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 마을에 있다'],
  techniques: ['경계값 분석'],
  elements: ['zone:Beginner', 'zone:Intermediate'],
  params: z.object({
    아래Z: z.number().int().min(0).max(199).describe('아래쪽 시험 Z 좌표 — X 100 에서 0 이상 199 이하').default(199),
    위Z: z.number().int().min(200).max(400).describe('위쪽 시험 Z 좌표 — X 100 에서 200 이상 400 이하').default(200),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa017');
    });

    await test.step('새 캐릭터가 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 마을에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Town', { blocker: true });
    });

    await test.step('캐릭터를 X 100, Z 199 로 옮긴다', async () => {
      await 순간이동(admin, 나!, { x: 100, z: params.아래Z });
      const 읽음 = await 캐릭터읽기(admin, 나!);
      await verify('X 100, Z 199 로 옮기면 캐릭터 구역이 「Beginner」다', 읽음.zone, 'Beginner');
    });

    await test.step('캐릭터를 X 100, Z 200 으로 옮긴다', async () => {
      await 순간이동(admin, 나!, { x: 100, z: params.위Z });
      const 읽음 = await 캐릭터읽기(admin, 나!);
      await verify('X 100, Z 200 으로 옮기면 캐릭터 구역이 「Intermediate」다', 읽음.zone, 'Intermediate');
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
