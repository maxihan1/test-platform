import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import {
  계정캐릭터목록,
  고유값,
  고유캐릭터이름,
  길드들지우기,
  길드만들고번호,
  길드목록,
  길드저장데이터,
  길드지우기,
  서버토큰,
  시험계정번호,
  캐릭터들지우기,
  캐릭터만들고번호,
} from './helpers/data.helper.js';
import { 길드번호읽기, 길드소속저장데이터 } from './helpers/save-data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-105',
  name: '길드를 삭제하면 멤버 캐릭터 저장 데이터의 길드 소속은 그대로 남는다',
  apiDoc: 2,
  precondition: ['「게임 서버」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
  }),
  expected: z.object({
    삭제응답코드: z.number().describe('길드 삭제 응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  let 토큰 = '';
  let 길드번호 = 0;
  let 캐릭터번호 = 0;
  const 계정번호 = 시험계정번호();
  const 길드들: number[] = [];
  const 캐릭터들: number[] = [];
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('길드를 만들고 그 길드 번호를 저장 데이터에 넣은 캐릭터를 만든다', async () => {
      길드번호 = await 길드만들고번호(request, 토큰, 길드저장데이터(`qa_tmp_fn105_${고유값()}`));
      if (길드번호 > 0) 길드들.push(길드번호);
      await verify('길드를 만든 응답의 id 가 1 이상의 정수다', Number.isInteger(길드번호) && 길드번호 > 0, true, { blocker: true });
      캐릭터번호 = await 캐릭터만들고번호(request, 토큰, 계정번호, 고유캐릭터이름('fn105'), 길드소속저장데이터(길드번호));
      if (캐릭터번호 > 0) 캐릭터들.push(캐릭터번호);
      await verify('캐릭터를 만든 응답의 id 가 1 이상의 정수다', Number.isInteger(캐릭터번호) && 캐릭터번호 > 0, true, { blocker: true });
    });
    await test.step('캐릭터 저장 데이터에 길드 번호를 넣은 뒤 그 길드를 삭제하고 캐릭터를 읽는다', async () => {
      const 응답 = await 길드지우기(request, 토큰, 길드번호);
      const 지움 = await verify('POST /api/deleteguild 응답 코드가 기대 결과와 같다', 응답.status(), expected.삭제응답코드);
      const 사라짐 = await verify('삭제한 길드 번호가 길드 목록에 없다', (await 길드목록(request, 토큰)).some((g) => g.id === 길드번호), false);
      const 행 = (await 계정캐릭터목록(request, 토큰, 계정번호)).find((c) => c.id === 캐릭터번호);
      const 남음 = await verify('캐릭터 저장 데이터의 길드 번호가 삭제한 길드 번호와 같다', 길드번호읽기(행?.saveData ?? ''), 길드번호);
      await verify('길드를 삭제하면 멤버 캐릭터 저장 데이터의 길드 소속은 그대로 남는다', 지움 && 사라짐 && 남음, true);
    });
  } finally {
    await 길드들지우기(request, 토큰, 길드들);
    await 캐릭터들지우기(request, 토큰, 캐릭터들);
  }
});
