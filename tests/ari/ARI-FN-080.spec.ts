import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유값, 계정캐릭터목록, 번호받기, 서버토큰, 시험계정번호, 캐릭터들지우기, 캐릭터만들기 } from './helpers/data.helper.js';
import { 이름겹침이풀릴때까지만들기 } from './helpers/save-data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-080',
  name: '빈 이름으로 캐릭터를 만들면 200 이고 캐릭터 목록에 빈 이름 그대로 보인다',
  apiDoc: 2,
  precondition: ['「게임 서버」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  let 토큰 = '';
  const 계정번호 = 시험계정번호();
  const 긴이름 = `qa_tmp_fn080_${고유값()}_${'가'.repeat(100)}`.slice(0, 100);
  const 금지문자이름 = `<>&%/ qa_tmp_fn080_${고유값()}`;
  const 만든것: number[] = [];
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('빈 이름으로 캐릭터를 만든다', async () => {
      const 응답 = await 이름겹침이풀릴때까지만들기(request, 토큰, 계정번호, '');
      const 번호 = await 번호받기(응답);
      if (번호 > 0) 만든것.push(번호);
      const 코드 = await verify('빈 이름 캐릭터 만들기 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 목록 = await 계정캐릭터목록(request, 토큰, 계정번호);
      const 보임 = await verify('캐릭터 목록에 빈 이름의 캐릭터가 보인다', 목록.some((c) => c.id === 번호 && c.name === ''), true);
      await verify('빈 이름으로 캐릭터를 만들면 200 이고 캐릭터 목록에 빈 이름 그대로 보인다', 코드 && 보임, true);
    });
    await test.step('100자 이름으로 캐릭터를 만든다', async () => {
      const 응답 = await 캐릭터만들기(request, 토큰, 계정번호, 긴이름);
      const 번호 = await 번호받기(응답);
      if (번호 > 0) 만든것.push(번호);
      const 코드 = await verify('100자 이름 캐릭터 만들기 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 목록 = await 계정캐릭터목록(request, 토큰, 계정번호);
      const 보임 = await verify('캐릭터 목록에 100자 이름의 캐릭터가 이름 그대로 보인다', 목록.some((c) => c.id === 번호 && c.name === 긴이름), true);
      await verify('100자 이름도 막히지 않고 캐릭터 목록에 그대로 보인다', 코드 && 보임, true);
    });
    await test.step('「<>&%/」가 든 이름으로 캐릭터를 만든다', async () => {
      const 응답 = await 캐릭터만들기(request, 토큰, 계정번호, 금지문자이름);
      const 번호 = await 번호받기(응답);
      if (번호 > 0) 만든것.push(번호);
      const 코드 = await verify('금지 문자가 든 이름 캐릭터 만들기 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 목록 = await 계정캐릭터목록(request, 토큰, 계정번호);
      const 보임 = await verify('캐릭터 목록에 금지 문자가 든 이름의 캐릭터가 이름 그대로 보인다', 목록.some((c) => c.id === 번호 && c.name === 금지문자이름), true);
      await verify('금지 문자가 든 이름도 막히지 않고 캐릭터 목록에 그대로 보인다', 코드 && 보임, true);
    });
  } finally {
    await 캐릭터들지우기(request, 토큰, 만든것);
  }
});
