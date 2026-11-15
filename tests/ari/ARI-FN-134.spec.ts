import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 번호받기, 서버토큰, 우편만들기, 우편저장데이터 } from './helpers/data.helper.js';
import { 시험캐릭터만들기, 우편과캐릭터지우기, 우편한통읽기 } from './helpers/mail.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-134',
  name: '우편 번호로 한 통을 부르면 200 과 그 우편의 id · playerCharacterId · saveData 가 돌아온다',
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
  const 보낸저장글 = 우편저장데이터('[QA] 우편 fn134');
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('시험용 캐릭터를 만들고 그 캐릭터에게 우편을 만든다', async () => {
      캐릭터번호 = await 시험캐릭터만들기(request, 토큰, 'fn134');
      if (캐릭터번호 > 0) 캐릭터들.push(캐릭터번호);
      await verify('시험용 캐릭터를 만들었다', 캐릭터번호 > 0, true, { blocker: true });
      우편번호 = await 번호받기(await 우편만들기(request, 토큰, 캐릭터번호, 보낸저장글));
      if (우편번호 > 0) 우편들.push(우편번호);
      await verify('시험용 우편을 만들었다', 우편번호 > 0, true, { blocker: true });
    });
    await test.step('만든 우편 번호로 POST /api/getmailmessage 를 부른다', async () => {
      const 읽음 = await 우편한통읽기(request, 토큰, 우편번호);
      const 코드 = await verify('POST /api/getmailmessage 응답 코드가 기대 결과와 같다', 읽음.코드, expected.응답코드);
      const 번호 = await verify('응답 id 가 만든 우편 번호와 같다', 읽음.id, 우편번호);
      const 캐릭터 = await verify('응답 playerCharacterId 가 받는 캐릭터 번호와 같다', 읽음.캐릭터번호, 캐릭터번호);
      const 저장 = await verify('응답 saveData 가 보낸 저장 데이터와 같다', 읽음.저장글, 보낸저장글);
      await verify('우편 번호로 한 통을 부르면 200 과 그 우편의 id · playerCharacterId · saveData 가 돌아온다', 코드 && 번호 && 캐릭터 && 저장, true);
    });
  } finally {
    await 우편과캐릭터지우기(request, 토큰, 우편들, 캐릭터들);
  }
});
