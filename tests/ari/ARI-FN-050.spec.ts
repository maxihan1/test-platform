import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 본문JSON } from './helpers/api.helper.js';
import { 고유캐릭터이름, 번호받기, 서버토큰, 시험계정번호, 캐릭터들지우기, 캐릭터만들기 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-050',
  name: '이름 중복으로 서비스가 실패하면 400 이고 본문은 제목 Bad Request · 상태 400 인 problem 형식이다',
  apiDoc: 2,
  precondition: ['「게임 서버」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(400),
    제목: z.string().describe('problem 본문의 제목').default('Bad Request'),
    상태: z.number().describe('problem 본문의 상태').default(400),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  let 토큰 = '';
  const 계정번호 = 시험계정번호();
  const 이름 = 고유캐릭터이름('fn050');
  const 만든것: number[] = [];
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('같은 이름의 캐릭터를 두 번 만든다', async () => {
      const 처음 = await 캐릭터만들기(request, 토큰, 계정번호, 이름);
      const 처음번호 = await 번호받기(처음);
      if (처음번호 > 0) 만든것.push(처음번호);
      await verify('처음 만든 캐릭터 응답 코드가 200 이다', 처음.status(), 200, { blocker: true });
      const 응답 = await 캐릭터만들기(request, 토큰, 계정번호, 이름);
      const 둘째번호 = await 번호받기(응답);
      if (둘째번호 > 0) 만든것.push(둘째번호);
      const 몸 = await 본문JSON<{ title?: string; status?: number }>(응답).catch(() => ({}) as { title?: string; status?: number });
      const 코드 = await verify('같은 이름으로 다시 만든 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 제목 = await verify('응답 본문의 title 이 기대 결과와 같다', 몸.title ?? '', expected.제목);
      const 상태 = await verify('응답 본문의 status 가 기대 결과와 같다', 몸.status ?? 0, expected.상태);
      await verify('이름 중복으로 서비스가 실패하면 400 이고 본문은 제목 Bad Request · 상태 400 인 problem 형식이다', 코드 && 제목 && 상태, true);
    });
  } finally {
    await 캐릭터들지우기(request, 토큰, 만든것);
  }
});
