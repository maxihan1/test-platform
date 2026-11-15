import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 본문JSON } from './helpers/api.helper.js';
import { 고유캐릭터이름, 길드들지우기, 길드만들기, 길드저장, 길드저장데이터, 길드지우기, 데이터부르기, 서버토큰, 응답글 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-042',
  name: '데이터 API 로 길드를 만들면 200 과 { "id": <번호> } 가 돌아온다',
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
  let 길드번호 = 0;
  let 삭제됨 = false;
  const 길드이름 = 고유캐릭터이름('fn042');
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('서버 토큰으로 POST /api/createguild 를 부른다', async () => {
      const 응답 = await 길드만들기(request, 토큰, 길드저장데이터(길드이름));
      const 몸 = await 본문JSON<{ id?: unknown }>(응답).catch(() => ({}) as { id?: unknown });
      길드번호 = typeof 몸.id === 'number' ? 몸.id : 0;
      const 코드 = await verify('POST /api/createguild 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 번호 = await verify('응답 id 가 1 이상의 정수다', 길드번호 > 0 && Number.isInteger(길드번호), true);
      await verify('데이터 API 로 길드를 만들면 200 과 { "id": <번호> } 가 돌아온다', 코드 && 번호, true);
    });
    await test.step('서버 토큰으로 POST /api/getguilds 를 부른다', async () => {
      const 응답 = await 데이터부르기(request, 토큰, 'getguilds');
      const 몸 = await 본문JSON<{ guilds?: unknown }>(응답).catch(() => ({}) as { guilds?: unknown });
      const 코드 = await verify('POST /api/getguilds 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 목록 = await verify('응답에 guilds 목록이 있다', Array.isArray(몸.guilds), true);
      await verify('길드 목록 응답은 200 과 { "guilds": [ ... ] } 꼴이다', 코드 && 목록, true);
    });
    await test.step('서버 토큰으로 만든 길드를 POST /api/saveguild 로 저장한 뒤 POST /api/deleteguild 로 삭제한다', async () => {
      await verify('만든 길드 번호가 있다', 길드번호 > 0, true, { blocker: true });
      const 저장 = await 길드저장(request, 토큰, 길드번호, 길드저장데이터(`${길드이름}_수정`));
      const 저장코드 = await verify('POST /api/saveguild 응답 코드가 기대 결과와 같다', 저장.status(), expected.응답코드);
      const 저장본문 = await verify('POST /api/saveguild 응답 본문이 비어 있다', await 응답글(저장), '');
      const 삭제 = await 길드지우기(request, 토큰, 길드번호);
      삭제됨 = 삭제.ok();
      const 삭제코드 = await verify('POST /api/deleteguild 응답 코드가 기대 결과와 같다', 삭제.status(), expected.응답코드);
      const 삭제본문 = await verify('POST /api/deleteguild 응답 본문이 비어 있다', await 응답글(삭제), '');
      await verify('길드 저장과 삭제 응답은 둘 다 본문 없는 200 이다', 저장코드 && 저장본문 && 삭제코드 && 삭제본문, true);
    });
  } finally {
    if (!삭제됨) await 길드들지우기(request, 토큰, [길드번호]);
  }
});
