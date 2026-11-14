import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 번호받기, 새아이템번호, 서버토큰, 아이템만들기, 아이템모두지우기, 아이템목록, 아이템저장데이터 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-121',
  name: '새 ItemInstanceId 로 아이템 인스턴스를 만들면 200 과 id 가 돌아온다',
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
    await test.step('새 ItemInstanceId 로 POST /api/createiteminstance 를 부른다', async () => {
      const 응답 = await 아이템만들기(request, 토큰, 아이템번호, 아이템저장데이터('qa_tmp_item_fn121'));
      const 번호 = await 번호받기(응답);
      const 코드 = await verify('POST /api/createiteminstance 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 있음 = await verify('응답 id 가 1 이상의 정수다', Number.isInteger(번호) && 번호 > 0, true);
      await verify('새 ItemInstanceId 로 아이템 인스턴스를 만들면 200 과 id 가 돌아온다', 코드 && 있음, true, { blocker: true });
    });
    await test.step('만든 뒤 POST /api/getiteminstances 를 부른다', async () => {
      const 목록 = await 아이템목록(request, 토큰);
      await verify('만든 아이템 인스턴스가 목록에 보인다', 목록.some((x) => x.itemInstanceId === 아이템번호), true);
    });
  } finally {
    await 아이템모두지우기(request, 토큰, 아이템번호);
  }
});
