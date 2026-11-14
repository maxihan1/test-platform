import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버오류글, 서버토큰, 없는번호, 아이템저장, 아이템저장데이터, 아이템지우기, 응답글 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-128',
  name: '없는 ItemInstanceId 로 저장하면 400 과 본문 「Error occured on server.  See server logs for more details.」이다',
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
  const 아이템번호 = 없는번호();
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  await test.step('없는 ItemInstanceId 로 POST /api/saveiteminstance 를 부른다', async () => {
    const 응답 = await 아이템저장(request, 토큰, 아이템번호, 아이템저장데이터('qa_tmp_item_fn128'));
    const 코드 = await verify('POST /api/saveiteminstance 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/saveiteminstance 응답 본문이 기대 결과와 같다', await 응답글(응답), expected.본문);
    await verify('없는 ItemInstanceId 로 저장하면 400 과 본문 「Error occured on server.  See server logs for more details.」이다', 코드 && 본문, true);
  });
  await test.step('없는 ItemInstanceId 로 POST /api/deleteiteminstance 를 부른다', async () => {
    const 응답 = await 아이템지우기(request, 토큰, 아이템번호);
    const 코드 = await verify('POST /api/deleteiteminstance 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/deleteiteminstance 응답 본문이 기대 결과와 같다', await 응답글(응답), expected.본문);
    await verify('없는 ItemInstanceId 로 삭제한 응답도 400 과 본문 「Error occured on server.  See server logs for more details.」이다', 코드 && 본문, true);
  });
});
