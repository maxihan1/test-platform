import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 같은아이템번호행들, 새아이템번호, 서버토큰, 아이템만들기, 아이템모두지우기, 아이템저장데이터 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-125',
  name: '같은 ItemInstanceId 로 두 번 만들면 막히지 않고 그 번호의 행이 둘 생긴다',
  apiDoc: 2,
  precondition: ['「게임 서버」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
    행수: z.number().describe('그 ItemInstanceId 의 행 수').default(2),
  }),
});

test(spec, async ({ request, params, expected }) => {
  let 토큰 = '';
  const 아이템번호 = 새아이템번호();
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('같은 ItemInstanceId 로 POST /api/createiteminstance 를 두 번 부른다', async () => {
      const 첫응답 = await 아이템만들기(request, 토큰, 아이템번호, 아이템저장데이터('qa_tmp_item_fn125'));
      const 둘째응답 = await 아이템만들기(request, 토큰, 아이템번호, 아이템저장데이터('qa_tmp_item_fn125'));
      const 행들 = await 같은아이템번호행들(request, 토큰, 아이템번호);
      const 첫코드 = await verify('첫 번째 만들기 응답 코드가 기대 결과와 같다', 첫응답.status(), expected.응답코드);
      const 둘째코드 = await verify('두 번째 만들기 응답 코드가 기대 결과와 같다', 둘째응답.status(), expected.응답코드);
      const 행수 = await verify('그 ItemInstanceId 의 행 수가 기대 결과와 같다', 행들.length, expected.행수);
      await verify('같은 ItemInstanceId 로 두 번 만들면 막히지 않고 그 번호의 행이 둘 생긴다', 첫코드 && 둘째코드 && 행수, true);
    });
  } finally {
    await 아이템모두지우기(request, 토큰, 아이템번호);
  }
});
