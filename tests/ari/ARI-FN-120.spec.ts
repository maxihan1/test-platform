import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 경매들지우기, 경매만들기, 경매저장데이터, 고유값, 번호받기, 서버토큰 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-120',
  name: '같은 경매 물품을 두 번 등록하면 막히지 않고 서로 다른 번호 둘이 생긴다',
  apiDoc: 2,
  precondition: ['「게임 서버」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  let 토큰 = '';
  const 저장데이터 = 경매저장데이터(`qa_tmp_fn120_${고유값()}`);
  const 번호들: number[] = [];
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('같은 저장 데이터로 경매 물품을 두 번 만든다', async () => {
      const 첫째 = await 경매만들기(request, 토큰, 저장데이터);
      const 첫째번호 = await 번호받기(첫째);
      if (첫째번호 > 0) 번호들.push(첫째번호);
      const 둘째 = await 경매만들기(request, 토큰, 저장데이터);
      const 둘째번호 = await 번호받기(둘째);
      if (둘째번호 > 0) 번호들.push(둘째번호);
      const 첫째코드 = await verify('첫 번째 POST /api/createauctionitem 응답 코드가 기대 결과와 같다', 첫째.status(), expected.응답코드);
      const 둘째코드 = await verify('두 번째 POST /api/createauctionitem 응답 코드가 기대 결과와 같다', 둘째.status(), expected.응답코드);
      const 다름 = await verify('두 번 만든 경매 물품의 번호가 서로 다르다', 첫째번호 > 0 && 둘째번호 > 0 && 첫째번호 !== 둘째번호, true);
      await verify('같은 경매 물품을 두 번 등록하면 막히지 않고 서로 다른 번호 둘이 생긴다', 첫째코드 && 둘째코드 && 다름, true);
    });
  } finally {
    await 경매들지우기(request, 토큰, 번호들);
  }
});
