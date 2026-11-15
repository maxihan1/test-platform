import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글자 } from './helpers/api.helper.js';
import { 번호받기, 서버토큰, 우편만들기, 우편저장데이터 } from './helpers/data.helper.js';
import { 시험캐릭터만들기, 우편과캐릭터지우기 } from './helpers/mail.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-145',
  name: '우편 요금 · 첨부 개수 · 제목 길이를 크게 넣으면 막히지 않고 200 이다',
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
    await test.step('시험용 캐릭터를 만든다', async () => {
      캐릭터번호 = await 시험캐릭터만들기(request, 토큰, 'fn145');
      if (캐릭터번호 > 0) 캐릭터들.push(캐릭터번호);
      await verify('시험용 캐릭터를 만들었다', 캐릭터번호 > 0, true, { blocker: true });
    });
    await test.step('요금 -1 · 첨부 100칸 · 제목 1,000자인 저장 데이터로 우편을 만든다', async () => {
      const 첨부칸들 = Array.from({ length: 100 }, () => ({ ItemInstanceIds: [] }));
      const 저장글 = 우편저장데이터(글자(1000), { CurrencyAmount: -1, AttachmentSlots: 첨부칸들 });
      const 응답 = await 우편만들기(request, 토큰, 캐릭터번호, 저장글);
      const 번호 = await 번호받기(응답);
      if (번호 > 0) 우편들.push(번호);
      await verify('우편 요금 · 첨부 개수 · 제목 길이를 크게 넣으면 막히지 않고 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 우편과캐릭터지우기(request, 토큰, 우편들, 캐릭터들);
  }
});
