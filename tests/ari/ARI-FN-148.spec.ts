import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 번호받기, 서버토큰, 우편만들기, 우편저장데이터 } from './helpers/data.helper.js';
import { 시험캐릭터만들기, 우편과캐릭터지우기, 우편한통읽기 } from './helpers/mail.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-148',
  name: '접속 중이 아닌 캐릭터에게 createmailmessage 로 우편을 보내면 서버가 저장 데이터에 우편 번호를 채워 넣지 않는다',
  apiDoc: 2,
  precondition: ['「게임 서버」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
    저장데이터우편번호: z.number().describe('읽은 저장 데이터의 MessageId').default(0),
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
    await test.step('접속 중이 아닌 시험용 캐릭터를 만든다', async () => {
      캐릭터번호 = await 시험캐릭터만들기(request, 토큰, 'fn148');
      if (캐릭터번호 > 0) 캐릭터들.push(캐릭터번호);
      await verify('시험용 캐릭터를 만들었다', 캐릭터번호 > 0, true, { blocker: true });
    });
    await test.step('접속 중이 아닌 시험용 캐릭터에게 우편 번호와 재화 첨부를 비운 저장 데이터로 POST /api/createmailmessage 를 부른 뒤 그 우편을 읽는다', async () => {
      const 응답 = await 우편만들기(request, 토큰, 캐릭터번호, 우편저장데이터('[QA] 우편 fn148', { MessageId: 0, CurrencyAmount: 0, AttachmentSlots: [] }));
      const 번호 = await 번호받기(응답);
      if (번호 > 0) 우편들.push(번호);
      await verify('POST /api/createmailmessage 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드, { blocker: true });
      const 읽음 = await 우편한통읽기(request, 토큰, 번호);
      const 저장 = JSON.parse(읽음.저장글 || '{}') as { MessageId?: number };
      await verify('접속 중이 아닌 캐릭터에게 createmailmessage 로 우편을 보내면 서버가 저장 데이터에 우편 번호를 채워 넣지 않는다', 저장.MessageId ?? -1, expected.저장데이터우편번호);
    });
  } finally {
    await 우편과캐릭터지우기(request, 토큰, 우편들, 캐릭터들);
  }
});
