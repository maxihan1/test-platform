import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 경매들지우기, 경매만들고번호, 경매목록, 경매저장, 경매저장데이터, 고유값, 서버토큰 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-113',
  name: '경매 물품을 저장하면 200 이고 목록의 saveData 가 보낸 값으로 바뀐다',
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
  const 고유 = 고유값();
  const 만든것: number[] = [];
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('저장 데이터를 넣어 POST /api/createauctionitem 으로 경매 물품을 만든다', async () => {
      번호 = await 경매만들고번호(request, 토큰, 경매저장데이터(`qa_tmp_fn113_a_${고유}`));
      if (번호 > 0) 만든것.push(번호);
      await verify('경매 물품을 만든 응답의 id 가 1 이상의 정수다', Number.isInteger(번호) && 번호 > 0, true, { blocker: true });
    });
    await test.step('만든 경매 물품을 다른 저장 데이터로 POST /api/saveauctionitem 한다', async () => {
      const 보낸값 = 경매저장데이터(`qa_tmp_fn113_b_${고유}`, 250);
      const 응답 = await 경매저장(request, 토큰, 번호, 보낸값);
      const 코드 = await verify('POST /api/saveauctionitem 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 목록 = await 경매목록(request, 토큰);
      const 바뀜 = await verify('경매 물품 목록의 그 물품 saveData 가 보낸 값과 같다', 목록.find((a) => a.id === 번호)?.saveData ?? '', 보낸값);
      await verify('경매 물품을 저장하면 200 이고 목록의 saveData 가 보낸 값으로 바뀐다', 코드 && 바뀜, true);
    });
  } finally {
    await 경매들지우기(request, 토큰, 만든것);
  }
});
