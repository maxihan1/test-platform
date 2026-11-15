import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버오류글, 서버토큰, 없는번호, 응답글, 캐릭터지우기 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-090',
  name: '없는 캐릭터 번호로 삭제하면 400 과 본문 「Error occured on server.  See server logs for more details.」이다',
  apiDoc: 2,
  precondition: ['「게임 서버」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(400),
    오류본문: z.string().describe('오류 본문').default(서버오류글),
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
  await test.step('없는 캐릭터 번호로 POST /api/deleteplayercharacter 를 부른다', async () => {
    const 응답 = await 캐릭터지우기(request, 토큰, 없는번호());
    const 코드 = await verify('POST /api/deleteplayercharacter 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('응답 본문이 기대 결과와 같다', await 응답글(응답), expected.오류본문);
    await verify('없는 캐릭터 번호로 삭제하면 400 과 본문 「Error occured on server.  See server logs for more details.」이다', 코드 && 본문, true);
  });
});
