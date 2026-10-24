import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정지우기, 봇처치, 새캐릭터, 순간이동, 오류코드, 줍기, 캐릭터읽기, 플레이어머리, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-351',
  name: '없는 캐릭터 번호로 읽으면 404 「NOT_FOUND」다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 있다', '새 캐릭터가 초록 들판에 있다'],
  techniques: ['동등 분할'],
  elements: ['zone:Beginner'],
  params: z.object({
    없는번호: z.number().int().min(1_000_000_000).max(2_000_000_000).describe('서버에 없는 번호 — 10억 이상 20억 이하 · 없는 번호면 같은 결과').default(2_000_000_000),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 초록 들판에 둔다', async () => {
      나 = await 새캐릭터(admin, 'zqa351');
      await 순간이동(admin, 나, 'Beginner');
    });

    await test.step('새 캐릭터가 있고 초록 들판에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 있다', (await 캐릭터읽기(admin, 나!)).id, 나!.id, { blocker: true });
      await verify('새 캐릭터가 초록 들판에 있다', (await 캐릭터읽기(admin, 나!)).zone, 'Beginner', { blocker: true });
    });

    await test.step('없는 캐릭터 번호로 캐릭터를 읽는다', async () => {
      const 응답 = await admin.get(`/characters/${String(params.없는번호)}`, { headers: 플레이어머리(나!) });
      const 코드 = await verify('응답 코드가 404 이다', 응답.status(), 404);
      const 이름 = await verify('오류 코드가 「NOT_FOUND」다', await 오류코드(응답), 'NOT_FOUND');
      await verify('없는 캐릭터 번호로 읽으면 404 「NOT_FOUND」다', 코드 && 이름, true);
    });

    await test.step('없는 아이템 번호로 장착한다', async () => {
      const 응답 = await admin.post(`/characters/${String(나!.id)}/equip`, { headers: 플레이어머리(나!), data: { itemId: params.없는번호 } });
      const 코드 = await verify('장착의 응답 코드가 404 이다', 응답.status(), 404);
      const 이름 = await verify('장착의 오류 코드가 「NOT_FOUND」다', await 오류코드(응답), 'NOT_FOUND');
      await verify('없는 아이템 번호로 장착하면 404 「NOT_FOUND」다', 코드 && 이름, true);
    });

    await test.step('없는 봇 번호로 봇을 처치한다', async () => {
      const 응답 = await 봇처치(admin, 나!, params.없는번호);
      const 코드 = await verify('처치의 응답 코드가 404 이다', 응답.status(), 404);
      const 이름 = await verify('처치의 오류 코드가 「NOT_FOUND」다', await 오류코드(응답), 'NOT_FOUND');
      await verify('없는 봇 번호로 처치하면 404 「NOT_FOUND」다', 코드 && 이름, true);
    });

    await test.step('없는 바닥 아이템 번호로 줍는다', async () => {
      const 응답 = await 줍기(admin, 나!, params.없는번호);
      const 코드 = await verify('줍기의 응답 코드가 404 이다', 응답.status(), 404);
      const 이름 = await verify('줍기의 오류 코드가 「NOT_FOUND」다', await 오류코드(응답), 'NOT_FOUND');
      await verify('없는 바닥 아이템 번호로 주우면 404 「NOT_FOUND」다', 코드 && 이름, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
