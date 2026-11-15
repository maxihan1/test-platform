import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 경매들지우기, 경매만들고번호, 경매목록, 경매저장데이터, 경매지우기, 고유값, 서버토큰 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-114',
  name: '경매 물품을 삭제하면 200 이고 목록에서 사라진다',
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
  let 번호 = 0;
  const 만든것: number[] = [];
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('저장 데이터를 넣어 POST /api/createauctionitem 으로 경매 물품을 만든다', async () => {
      번호 = await 경매만들고번호(request, 토큰, 경매저장데이터(`qa_tmp_fn114_${고유값()}`));
      if (번호 > 0) 만든것.push(번호);
      await verify('경매 물품을 만든 응답의 id 가 1 이상의 정수다', Number.isInteger(번호) && 번호 > 0, true, { blocker: true });
      await verify('삭제 전 경매 물품 목록에 만든 물품 번호가 보인다', (await 경매목록(request, 토큰)).some((a) => a.id === 번호), true, { blocker: true });
    });
    await test.step('만든 경매 물품을 POST /api/deleteauctionitem 으로 삭제한다', async () => {
      const 응답 = await 경매지우기(request, 토큰, 번호);
      const 코드 = await verify('POST /api/deleteauctionitem 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 사라짐 = await verify('삭제한 경매 물품 번호가 목록에 없다', (await 경매목록(request, 토큰)).some((a) => a.id === 번호), false);
      await verify('경매 물품을 삭제하면 200 이고 목록에서 사라진다', 코드 && 사라짐, true);
    });
  } finally {
    await 경매들지우기(request, 토큰, 만든것);
  }
});
