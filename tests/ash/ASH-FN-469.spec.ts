import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 바꾸기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { GM골드, 거부됨 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-469',
  name: 'GM 골드 −100 을 주면 골드가 400 이다',
  platforms: ['android'],
  precondition: ['골드 500 인 새 캐릭터가 있다'],
  elements: ['flow:골드-GM'],
  params: z.object({
    뺄골드: z.number().int().min(1).max(500).describe('GM 으로 뺄 골드 — 1 이상 500 이하').default(100),
    넘는골드: z.number().int().min(501).describe('GM 으로 빼려는 골드 — 시작 골드 500 을 넘는 값').default(501),
  }),
  expected: null,
});

const 시작골드 = 500;

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('골드 500 인 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa469');
    });

    await test.step('새 캐릭터의 골드가 500 인지 확인한다', async () => {
      await verify('새 캐릭터의 골드가 500 이다', (await 캐릭터읽기(admin, 나!)).gold, 시작골드, { blocker: true });
    });

    await test.step('GM 골드 −100 을 준다', async () => {
      const 응답 = await GM골드(admin, 나!, -params.뺄골드);
      const 코드 = await verify('GM 골드 응답이 200 이다', 응답.status(), 200);
      const 골드 = await verify('골드가 400 이다', (await 캐릭터읽기(admin, 나!)).gold, 시작골드 - params.뺄골드);
      await verify('GM 골드 −100 을 주면 골드가 400 이다', 코드 && 골드, true);
    });

    await test.step('GM 골드 −501 을 준다', async () => {
      await 바꾸기(admin, 나!, { gold: 시작골드 });
      const 응답 = await GM골드(admin, 나!, -params.넘는골드);
      const 거부 = await verify('GM 골드 요청이 거부된다', 거부됨(응답), true);
      const 골드 = await verify('골드가 0 이상이다', (await 캐릭터읽기(admin, 나!)).gold >= 0, true);
      await verify('GM 골드 −501 을 주면 거부되고 골드가 0 아래로 내려가지 않는다', 거부 && 골드, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
