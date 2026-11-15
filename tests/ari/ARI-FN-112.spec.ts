import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 경매들지우기, 경매만들기, 경매목록, 경매저장데이터, 고유값, 번호받기, 서버토큰 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-112',
  name: '경매 물품을 만들면 200 과 새 번호 id 가 돌아온다',
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
  const 이름 = `qa_tmp_fn112_${고유값()}`;
  const 만든것: number[] = [];
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('서버 토큰으로 저장 데이터를 넣어 POST /api/createauctionitem 을 부른다', async () => {
      const 응답 = await 경매만들기(request, 토큰, 경매저장데이터(이름));
      const 번호 = await 번호받기(응답);
      if (번호 > 0) 만든것.push(번호);
      const 코드 = await verify('POST /api/createauctionitem 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 있음 = await verify('응답 id 가 1 이상의 정수다', Number.isInteger(번호) && 번호 > 0, true);
      await verify('경매 물품을 만들면 200 과 새 번호 id 가 돌아온다', 코드 && 있음, true);
    });
    await test.step('만든 뒤 POST /api/getauctionitems 를 부른다', async () => {
      const 목록 = await 경매목록(request, 토큰);
      await verify('만든 경매 물품 번호가 목록에 보인다', 목록.some((a) => a.id === 만든것[0]), true);
    });
  } finally {
    await 경매들지우기(request, 토큰, 만든것);
  }
});
