import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 번호받기, 서버토큰, 우편만들기, 우편목록, 우편저장데이터, 우편지우기 } from './helpers/data.helper.js';
import { 시험캐릭터만들기, 우편과캐릭터지우기 } from './helpers/mail.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-132',
  name: '우편을 삭제하면 200 이고 그 우편이 목록에서 사라진다',
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
    await test.step('시험용 캐릭터를 만들고 그 캐릭터에게 우편을 만든다', async () => {
      캐릭터번호 = await 시험캐릭터만들기(request, 토큰, 'fn132');
      if (캐릭터번호 > 0) 캐릭터들.push(캐릭터번호);
      await verify('시험용 캐릭터를 만들었다', 캐릭터번호 > 0, true, { blocker: true });
      우편번호 = await 번호받기(await 우편만들기(request, 토큰, 캐릭터번호, 우편저장데이터('[QA] 우편 fn132')));
      if (우편번호 > 0) 우편들.push(우편번호);
      await verify('시험용 우편을 만들었다', 우편번호 > 0, true, { blocker: true });
    });
    await test.step('만든 우편을 POST /api/deletemailmessage 로 삭제한다', async () => {
      const 응답 = await 우편지우기(request, 토큰, 우편번호);
      const 목록 = await 우편목록(request, 토큰, 캐릭터번호);
      const 코드 = await verify('POST /api/deletemailmessage 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 사라짐 = await verify('삭제한 우편이 목록에 없다', 목록.some((x) => x.id === 우편번호), false);
      await verify('우편을 삭제하면 200 이고 그 우편이 목록에서 사라진다', 코드 && 사라짐, true);
    });
  } finally {
    await 우편과캐릭터지우기(request, 토큰, 우편들, 캐릭터들);
  }
});
