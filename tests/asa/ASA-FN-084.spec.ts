import { defineCase, test, verify } from '@platform/kit';

import { 무작위글자 } from './helpers/api.helper.js';
import { 계정만들기, 오류코드읽기, 캐릭터만들기 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-084',
  name: '캐릭터 이름에 「!」를 넣어 만들면 400 「VALIDATION_FAILED」로 막힌다',
  apiDoc: 1,
  techniques: ['동등 분할'],
  precondition: ['로그인한 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 토큰 = '';

  await test.step('일회용 계정을 만든다', async () => {
    토큰 = await 계정만들기(request);
  });

  await test.step('로그인한 계정이 있는지 확인한다', async () => {
    await verify('계정 토큰이 돌아온다', 토큰 !== '', true, { blocker: true });
  });

  await test.step('캐릭터 이름에 「!」를 넣어 만든다', async () => {
    const 응답 = await 캐릭터만들기(request, 토큰, 'Warrior', `a!${무작위글자(6)}`);
    const 코드 = await verify('「!」가 든 이름 캐릭터 만들기 응답 코드가 400 이다', 응답.status(), 400);
    const 오류 = await verify('「!」가 든 이름 캐릭터 만들기 오류 코드가 「VALIDATION_FAILED」다', await 오류코드읽기(응답), 'VALIDATION_FAILED');
    await verify('캐릭터 이름에 「!」를 넣어 만들면 400 「VALIDATION_FAILED」로 막힌다', 코드 && 오류, true);
  });
});
