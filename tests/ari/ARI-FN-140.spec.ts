import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버토큰, 없는번호, 우편하나, 응답글 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-140',
  name: '없는 우편 번호로 한 통을 조회하면 400 과 본문 「Mail message not found.」이다',
  apiDoc: 2,
  precondition: ['「게임 서버」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(400),
    본문: z.string().describe('응답 본문').default('Mail message not found.'),
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
  await test.step('없는 우편 번호로 POST /api/getmailmessage 를 부른다', async () => {
    const 응답 = await 우편하나(request, 토큰, 없는번호());
    const 코드 = await verify('POST /api/getmailmessage 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/getmailmessage 응답 본문이 기대 결과와 같다', await 응답글(응답), expected.본문);
    await verify('없는 우편 번호로 한 통을 조회하면 400 과 본문 「Mail message not found.」이다', 코드 && 본문, true);
  });
});
