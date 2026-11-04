import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정만들기, 오류코드읽기, 캐릭터만들기, 캐릭터번호읽기 } from './helpers/game.helper.js';
import { 길이별캐릭터이름 } from './helpers/character.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-080',
  name: '캐릭터 이름을 1자로 적어 만들면 400 「VALIDATION_FAILED」로 막힌다',
  apiDoc: 1,
  techniques: ['경계값 분석'],
  precondition: ['로그인한 계정이 있다'],
  params: z.object({
    짧은이름길이: z.number().int().min(0).describe('막혀야 할 짧은 캐릭터 이름 길이 — 0~1자').default(1),
    가장짧은이름길이: z.number().int().describe('만들어져야 할 가장 짧은 캐릭터 이름 길이 — 2~12자').default(2),
    가장긴이름길이: z.number().int().describe('만들어져야 할 가장 긴 캐릭터 이름 길이 — 2~12자').default(12),
    긴이름길이: z.number().int().describe('막혀야 할 긴 캐릭터 이름 길이 — 13자 이상').default(13),
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

  await test.step('캐릭터 이름을 1자로 적어 만든다', async () => {
    const 응답 = await 캐릭터만들기(request, 토큰, 'Warrior', 길이별캐릭터이름(params.짧은이름길이));
    const 코드 = await verify('1자 이름 캐릭터 만들기 응답 코드가 400 이다', 응답.status(), 400);
    const 오류 = await verify('1자 이름 캐릭터 만들기 오류 코드가 「VALIDATION_FAILED」다', await 오류코드읽기(응답), 'VALIDATION_FAILED');
    await verify('캐릭터 이름을 1자로 적어 만들면 400 「VALIDATION_FAILED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('캐릭터 이름을 2자로 적어 만든다', async () => {
    const 응답 = await 캐릭터만들기(request, 토큰, 'Warrior', 길이별캐릭터이름(params.가장짧은이름길이));
    await verify('캐릭터 이름을 2자로 적어 만들면 새 캐릭터 「id」가 돌아온다', (await 캐릭터번호읽기(응답)) > 0, true);
  });

  await test.step('캐릭터 이름을 12자로 적어 만든다', async () => {
    const 응답 = await 캐릭터만들기(request, 토큰, 'Warrior', 길이별캐릭터이름(params.가장긴이름길이));
    await verify('캐릭터 이름을 12자로 적어 만들면 새 캐릭터 「id」가 돌아온다', (await 캐릭터번호읽기(응답)) > 0, true);
  });

  await test.step('캐릭터 이름을 13자로 적어 만든다', async () => {
    const 응답 = await 캐릭터만들기(request, 토큰, 'Warrior', 길이별캐릭터이름(params.긴이름길이));
    const 코드 = await verify('13자 이름 캐릭터 만들기 응답 코드가 400 이다', 응답.status(), 400);
    const 오류 = await verify('13자 이름 캐릭터 만들기 오류 코드가 「VALIDATION_FAILED」다', await 오류코드읽기(응답), 'VALIDATION_FAILED');
    await verify('캐릭터 이름을 13자로 적어 만들면 400 「VALIDATION_FAILED」로 막힌다', 코드 && 오류, true);
  });
});
