import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 캐릭터지우기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-638',
  name: '캐릭터를 지우면 응답 코드가 기대값과 같다',
  apiDoc: 1,
  precondition: ['캐릭터가 하나 있다'],
  params: null,
  expected: z.object({
    지우기응답코드: z.number().int().describe('캐릭터를 지웠을 때의 응답 코드 — 기획서는 204 · API 문서 판 1 은 200').default(204),
  }),
});

test(spec, async ({ request, expected }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 캐릭터를 만든다', async () => {
    나 = await 플레이어만들기(request);
  });

  await test.step('지울 캐릭터를 확인한다', async () => {
    await verify('새 캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
  });

  await test.step('그 캐릭터를 지운다', async () => {
    const 응답 = await 캐릭터지우기(request, 나);
    await verify('캐릭터를 지우면 응답 코드가 기대값과 같다', 응답.status(), expected.지우기응답코드);
  });
});
