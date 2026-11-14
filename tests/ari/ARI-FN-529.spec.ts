import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 날글로부르기, 서버토큰 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-529',
  name: 'ItemInstanceId 에 글자를 넣어 아이템 인스턴스를 만들면 400 이다',
  apiDoc: 2,
  precondition: ['「게임 서버」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(400),
  }),
});

test(spec, async ({ request, params, expected }) => {
  let 토큰 = '';
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  await test.step('서버 토큰으로 ItemInstanceId 에 글자를 넣어 POST /api/createiteminstance 를 부른다', async () => {
    const 응답 = await 날글로부르기(request, 토큰, 'createiteminstance', '{"ItemInstanceId":"abc","SaveData":"{}"}');
    await verify('ItemInstanceId 에 글자를 넣어 아이템 인스턴스를 만들면 400 이다', 응답.status(), expected.응답코드);
  });
});
