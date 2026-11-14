import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 경매들지우기, 경매만들기, 경매목록, 경매저장데이터, 고유값, 번호받기, 서버토큰 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-118',
  name: '가격이 음수인 경매 물품을 만들면 막히지 않고 목록에 그대로 저장된다',
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
  const 보낸값 = 경매저장데이터(`qa_tmp_fn118_${고유값()}`, -100);
  const 만든것: number[] = [];
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('가격을 음수로 넣은 저장 데이터로 경매 물품을 만든다', async () => {
      const 응답 = await 경매만들기(request, 토큰, 보낸값);
      const 번호 = await 번호받기(응답);
      if (번호 > 0) 만든것.push(번호);
      const 코드 = await verify('POST /api/createauctionitem 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 행 = (await 경매목록(request, 토큰)).find((a) => a.id === 번호);
      const 저장됨 = await verify('경매 물품 목록의 그 물품 saveData 가 보낸 값과 같다', 행?.saveData ?? '', 보낸값);
      await verify('가격이 음수인 경매 물품을 만들면 막히지 않고 목록에 그대로 저장된다', 코드 && 저장됨, true);
    });
  } finally {
    await 경매들지우기(request, 토큰, 만든것);
  }
});
