import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 길드저장, 길드저장데이터, 서버오류글, 서버토큰, 없는번호, 응답글 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-052',
  name: '데이터 API 에서 대상 번호가 없으면 404 가 아니라 400 과 본문 「Error occured on server.  See server logs for more details.」이다',
  apiDoc: 2,
  precondition: ['「게임 서버」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(400),
    본문: z.string().describe('응답 본문').default(서버오류글),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  let 토큰 = '';
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  await test.step('서버 토큰으로 없는 길드 번호에 POST /api/saveguild 를 부른다', async () => {
    const 응답 = await 길드저장(request, 토큰, 없는번호(), 길드저장데이터('qa_tmp_fn052'));
    const 코드 = await verify('POST /api/saveguild 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/saveguild 응답 본문이 기대 결과와 같다', await 응답글(응답), expected.본문);
    await verify('데이터 API 에서 대상 번호가 없으면 404 가 아니라 400 과 본문 「Error occured on server.  See server logs for more details.」이다', 코드 && 본문, true);
  });
});
