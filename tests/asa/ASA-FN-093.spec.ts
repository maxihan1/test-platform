import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정만들기, 오류코드읽기 } from './helpers/game.helper.js';
import { 막힐때까지캐릭터만들기 } from './helpers/character.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-093',
  name: '캐릭터 수가 한도를 넘게 만들면 409 「CHARACTER_LIMIT」으로 막힌다',
  apiDoc: 2,
  techniques: ['동등 분할'],
  precondition: ['로그인한 계정이 있다'],
  params: z.object({
    만들어볼횟수: z.number().int().min(1).describe('캐릭터를 만들어 볼 최대 횟수 — 한도를 넘을 만큼 큰 수').default(20),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  let 토큰 = '';

  await test.step('일회용 계정을 만든다', async () => {
    토큰 = await 계정만들기(request);
  });

  await test.step('로그인한 계정이 있는지 확인한다', async () => {
    await verify('계정 토큰이 돌아온다', 토큰 !== '', true, { blocker: true });
  });

  await test.step('캐릭터를 막힐 때까지 만든다', async () => {
    const 응답 = await 막힐때까지캐릭터만들기(request, 토큰, params.만들어볼횟수);
    const 코드 = await verify('막힐 때까지 만든 마지막 응답 코드가 409 이다', 응답?.status(), 409);
    const 오류 = await verify(
      '막힐 때까지 만든 마지막 응답 오류 코드가 「CHARACTER_LIMIT」이다',
      응답 === undefined ? '' : await 오류코드읽기(응답),
      'CHARACTER_LIMIT',
    );
    await verify('캐릭터 수가 한도를 넘게 만들면 409 「CHARACTER_LIMIT」으로 막힌다', 코드 && 오류, true);
  });
});
