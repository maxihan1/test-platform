import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유값, 길드들지우기, 길드만들고번호, 길드목록, 길드저장데이터, 길드지우기, 서버토큰 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-099',
  name: '길드를 삭제하면 200 이고 그 번호가 길드 목록에서 사라진다',
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
    await test.step('저장 데이터를 넣어 POST /api/createguild 로 길드를 만든다', async () => {
      번호 = await 길드만들고번호(request, 토큰, 길드저장데이터(`qa_tmp_fn099_${고유값()}`));
      if (번호 > 0) 만든것.push(번호);
      await verify('길드를 만든 응답의 id 가 1 이상의 정수다', Number.isInteger(번호) && 번호 > 0, true, { blocker: true });
      await verify('삭제 전 길드 목록에 만든 길드 번호가 보인다', (await 길드목록(request, 토큰)).some((g) => g.id === 번호), true, { blocker: true });
    });
    await test.step('만든 길드를 POST /api/deleteguild 로 삭제한다', async () => {
      const 응답 = await 길드지우기(request, 토큰, 번호);
      const 코드 = await verify('POST /api/deleteguild 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 사라짐 = await verify('삭제한 길드 번호가 길드 목록에 없다', (await 길드목록(request, 토큰)).some((g) => g.id === 번호), false);
      await verify('길드를 삭제하면 200 이고 그 번호가 길드 목록에서 사라진다', 코드 && 사라짐, true);
    });
  } finally {
    await 길드들지우기(request, 토큰, 만든것);
  }
});
