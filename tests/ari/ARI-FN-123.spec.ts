import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 같은아이템번호행들, 새아이템번호, 서버토큰, 아이템만들기, 아이템모두지우기, 아이템저장데이터, 아이템지우기 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-123',
  name: 'ItemInstanceId 로 삭제하면 200 이고 그 아이템 인스턴스가 목록에서 사라진다',
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
    await test.step('새 ItemInstanceId 로 아이템 인스턴스를 만든다', async () => {
      const 응답 = await 아이템만들기(request, 토큰, 아이템번호, 아이템저장데이터('qa_tmp_item_fn123'));
      await verify('아이템 인스턴스를 만들었다', 응답.status(), 200, { blocker: true });
    });
    await test.step('만든 아이템 인스턴스를 ItemInstanceId 로 POST /api/deleteiteminstance 한다', async () => {
      const 응답 = await 아이템지우기(request, 토큰, 아이템번호);
      const 행들 = await 같은아이템번호행들(request, 토큰, 아이템번호);
      const 코드 = await verify('POST /api/deleteiteminstance 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 사라짐 = await verify('삭제한 아이템 인스턴스가 목록에 없다', 행들.length === 0, true);
      await verify('ItemInstanceId 로 삭제하면 200 이고 그 아이템 인스턴스가 목록에서 사라진다', 코드 && 사라짐, true);
    });
  } finally {
    await 아이템모두지우기(request, 토큰, 아이템번호);
  }
});
