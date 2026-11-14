import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유값, 길드들지우기, 길드만들고번호, 길드저장데이터, 데이터부르기, 서버토큰 } from './helpers/data.helper.js';
import { 본문JSON } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-100',
  name: '길드 목록을 부르면 200 과 만든 길드 둘이 다 들어 있다',
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
  const 번호들: number[] = [];
  const 고유 = 고유값();
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('저장 데이터를 넣어 POST /api/createguild 로 길드 둘을 만든다', async () => {
      번호들.push(await 길드만들고번호(request, 토큰, 길드저장데이터(`qa_tmp_fn100_a_${고유}`)));
      번호들.push(await 길드만들고번호(request, 토큰, 길드저장데이터(`qa_tmp_fn100_b_${고유}`)));
      await verify('첫째 길드를 만든 응답의 id 가 1 이상의 정수다', 번호들[0] !== undefined && 번호들[0] > 0, true, { blocker: true });
      await verify('둘째 길드를 만든 응답의 id 가 1 이상의 정수다', 번호들[1] !== undefined && 번호들[1] > 0, true, { blocker: true });
    });
    await test.step('길드 둘을 만든 뒤 POST /api/getguilds 를 부른다', async () => {
      const 응답 = await 데이터부르기(request, 토큰, 'getguilds');
      const 코드 = await verify('POST /api/getguilds 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 줄들 = 응답.ok() ? (await 본문JSON<{ guilds: { id: number }[] }>(응답)).guilds : [];
      const 첫째 = await verify('길드 목록에 첫째 길드가 들어 있다', 줄들.some((g) => g.id === 번호들[0]), true);
      const 둘째 = await verify('길드 목록에 둘째 길드가 들어 있다', 줄들.some((g) => g.id === 번호들[1]), true);
      await verify('길드 목록을 부르면 200 과 만든 길드 둘이 다 들어 있다', 코드 && 첫째 && 둘째, true);
    });
  } finally {
    await 길드들지우기(request, 토큰, 번호들);
  }
});
