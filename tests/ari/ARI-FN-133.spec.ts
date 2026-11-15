import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 번호받기, 서버토큰, 우편만들기, 우편저장데이터 } from './helpers/data.helper.js';
import { 시험캐릭터만들기, 우편과캐릭터지우기, 우편목록결과읽기 } from './helpers/mail.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-133',
  name: '캐릭터 번호로 우편 목록을 부르면 200 과 그 캐릭터가 받은 우편 둘이 돌아온다',
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
  let 캐릭터번호 = 0;
  const 캐릭터들: number[] = [];
  const 우편들: number[] = [];
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('시험용 캐릭터를 만들고 그 캐릭터에게 우편 둘을 만든다', async () => {
      캐릭터번호 = await 시험캐릭터만들기(request, 토큰, 'fn133');
      if (캐릭터번호 > 0) 캐릭터들.push(캐릭터번호);
      await verify('시험용 캐릭터를 만들었다', 캐릭터번호 > 0, true, { blocker: true });
      const 첫번호 = await 번호받기(await 우편만들기(request, 토큰, 캐릭터번호, 우편저장데이터('[QA] 우편 fn133 첫째')));
      if (첫번호 > 0) 우편들.push(첫번호);
      const 둘째번호 = await 번호받기(await 우편만들기(request, 토큰, 캐릭터번호, 우편저장데이터('[QA] 우편 fn133 둘째')));
      if (둘째번호 > 0) 우편들.push(둘째번호);
      await verify('시험용 우편 둘을 만들었다', 우편들.length, 2, { blocker: true });
    });
    await test.step('우편 둘을 받은 캐릭터 번호로 POST /api/getmailmessages 를 부른다', async () => {
      const 결과 = await 우편목록결과읽기(request, 토큰, 캐릭터번호);
      const 받은번호들 = (결과.몸?.mailMessages ?? []).map((x) => x.id).sort((a, b) => a - b).join(', ');
      const 만든번호들 = [...우편들].sort((a, b) => a - b).join(', ');
      const 코드 = await verify('POST /api/getmailmessages 응답 코드가 기대 결과와 같다', 결과.코드, expected.응답코드);
      const 같음 = await verify('돌아온 우편 번호가 그 캐릭터가 받은 우편 둘과 같다', 받은번호들, 만든번호들);
      await verify('캐릭터 번호로 우편 목록을 부르면 200 과 그 캐릭터가 받은 우편 둘이 돌아온다', 코드 && 같음, true);
    });
  } finally {
    await 우편과캐릭터지우기(request, 토큰, 우편들, 캐릭터들);
  }
});
