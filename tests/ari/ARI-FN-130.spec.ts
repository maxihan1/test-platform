import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 번호받기, 서버토큰, 우편만들기, 우편목록, 우편저장데이터 } from './helpers/data.helper.js';
import { 시험캐릭터만들기, 우편과캐릭터지우기 } from './helpers/mail.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-130',
  name: '받는 캐릭터에게 우편을 만들면 200 과 id 가 돌아온다',
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
  let 우편번호 = 0;
  const 캐릭터들: number[] = [];
  const 우편들: number[] = [];
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('시험용 캐릭터를 만든다', async () => {
      캐릭터번호 = await 시험캐릭터만들기(request, 토큰, 'fn130');
      if (캐릭터번호 > 0) 캐릭터들.push(캐릭터번호);
      await verify('시험용 캐릭터를 만들었다', 캐릭터번호 > 0, true, { blocker: true });
    });
    await test.step('만든 캐릭터에게 POST /api/createmailmessage 로 우편을 만든다', async () => {
      const 응답 = await 우편만들기(request, 토큰, 캐릭터번호, 우편저장데이터('[QA] 우편 fn130'));
      우편번호 = await 번호받기(응답);
      if (우편번호 > 0) 우편들.push(우편번호);
      const 코드 = await verify('POST /api/createmailmessage 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 있음 = await verify('응답 id 가 1 이상의 정수다', Number.isInteger(우편번호) && 우편번호 > 0, true);
      await verify('받는 캐릭터에게 우편을 만들면 200 과 id 가 돌아온다', 코드 && 있음, true, { blocker: true });
    });
    await test.step('만든 뒤 그 캐릭터 번호로 POST /api/getmailmessages 를 부른다', async () => {
      const 목록 = await 우편목록(request, 토큰, 캐릭터번호);
      await verify('만든 우편이 받는 캐릭터의 우편 목록에 보인다', 목록.some((x) => x.id === 우편번호), true);
    });
  } finally {
    await 우편과캐릭터지우기(request, 토큰, 우편들, 캐릭터들);
  }
});
