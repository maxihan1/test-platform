import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버토큰 } from './helpers/data.helper.js';
import { 시험캐릭터만들기, 우편과캐릭터지우기, 우편목록결과읽기 } from './helpers/mail.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-141',
  name: '우편이 없는 캐릭터의 우편 목록을 부르면 200 과 { "mailMessages": [] } 이다',
  apiDoc: 2,
  precondition: ['「게임 서버」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
    본문: z.string().describe('응답 본문').default('{"mailMessages":[]}'),
  }),
});

test(spec, async ({ request, params, expected }) => {
  let 토큰 = '';
  let 캐릭터번호 = 0;
  const 캐릭터들: number[] = [];
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('우편을 받은 적 없는 시험용 캐릭터를 만든다', async () => {
      캐릭터번호 = await 시험캐릭터만들기(request, 토큰, 'fn141');
      if (캐릭터번호 > 0) 캐릭터들.push(캐릭터번호);
      await verify('시험용 캐릭터를 만들었다', 캐릭터번호 > 0, true, { blocker: true });
    });
    await test.step('우편이 없는 캐릭터 번호로 POST /api/getmailmessages 를 부른다', async () => {
      const 결과 = await 우편목록결과읽기(request, 토큰, 캐릭터번호);
      const 코드 = await verify('POST /api/getmailmessages 응답 코드가 기대 결과와 같다', 결과.코드, expected.응답코드);
      const 본문 = await verify('POST /api/getmailmessages 응답 본문이 기대 결과와 같다', JSON.stringify(결과.몸), expected.본문);
      await verify('우편이 없는 캐릭터의 우편 목록을 부르면 200 과 { "mailMessages": [] } 이다', 코드 && 본문, true);
    });
  } finally {
    await 우편과캐릭터지우기(request, 토큰, [], 캐릭터들);
  }
});
