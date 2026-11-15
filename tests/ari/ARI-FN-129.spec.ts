import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 새아이템번호, 서버토큰, 아이템만들기, 아이템모두지우기, 아이템저장데이터 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-129',
  name: '없는 아이템 이름 · 품질로 만들면 막히지 않고 200 이다',
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
  const 아이템번호 = 새아이템번호();
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('없는 아이템 이름과 품질을 넣은 저장 데이터로 아이템 인스턴스를 만든다', async () => {
      const 응답 = await 아이템만들기(request, 토큰, 아이템번호, 아이템저장데이터('qa_tmp_no_such_item_fn129', 'NoSuchQuality'));
      await verify('없는 아이템 이름 · 품질로 만들면 막히지 않고 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 아이템모두지우기(request, 토큰, 아이템번호);
  }
});
