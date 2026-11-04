import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정만들기, 캐릭터만들기, 캐릭터번호읽기 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-637',
  name: '새 이름으로 캐릭터를 만들면 응답 코드가 기대값과 같다',
  apiDoc: 2,
  precondition: ['로그인한 계정이 있다'],
  params: null,
  expected: z.object({
    만들기응답코드: z.number().int().describe('캐릭터를 만들었을 때의 응답 코드 — 기획서는 201 · API 문서 판 1 은 200').default(201),
  }),
});

test(spec, async ({ request, expected }) => {
  let 토큰 = '';

  await test.step('일회용 계정으로 로그인한다', async () => {
    토큰 = await 계정만들기(request);
  });

  await test.step('로그인 토큰을 확인한다', async () => {
    await verify('로그인 토큰이 돌아온다', 토큰 !== '', true, {
      blocker: true,
    });
  });

  await test.step('새 이름으로 캐릭터를 만든다', async () => {
    const 응답 = await 캐릭터만들기(request, 토큰);
    const 있음 = await verify('새 캐릭터 「id」가 돌아온다', (await 캐릭터번호읽기(응답)) > 0, true);
    const 코드 = await verify('캐릭터 만들기 응답 코드가 기대값과 같다', 응답.status(), expected.만들기응답코드);
    await verify('새 이름으로 캐릭터를 만들면 응답 코드가 기대값과 같다', 코드 && 있음, true);
  });
});
