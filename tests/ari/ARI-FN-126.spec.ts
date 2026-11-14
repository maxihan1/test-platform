import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 같은아이템번호행들, 새아이템번호, 서버토큰, 아이템만들기, 아이템모두지우기, 아이템저장, 아이템저장데이터, 아이템지우기 } from './helpers/data.helper.js';
import { 다른아이템번호 } from './helpers/mail.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-126',
  name: '같은 ItemInstanceId 행이 둘일 때 저장하면 첫 행에만 적용된다',
  apiDoc: 2,
  precondition: ['「게임 서버」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
  }),
  expected: z.object({
    행수: z.number().describe('만든 뒤 그 ItemInstanceId 의 행 수').default(2),
  }),
});

test(spec, async ({ request, params, expected }) => {
  let 토큰 = '';
  const 저장번호 = 새아이템번호();
  const 삭제번호 = 다른아이템번호(저장번호);
  const 처음저장글 = 아이템저장데이터('qa_tmp_item_fn126');
  const 바꾼저장글 = 아이템저장데이터('qa_tmp_item_fn126_after', 'Rare');
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('같은 ItemInstanceId 행 둘을 만든 뒤 그 번호로 저장한다', async () => {
      await 아이템만들기(request, 토큰, 저장번호, 처음저장글);
      await 아이템만들기(request, 토큰, 저장번호, 처음저장글);
      const 만든행들 = await 같은아이템번호행들(request, 토큰, 저장번호);
      await verify('같은 ItemInstanceId 의 행 수가 기대 결과와 같다', 만든행들.length, expected.행수, { blocker: true });
      await 아이템저장(request, 토큰, 저장번호, 바꾼저장글);
      const 행들 = await 같은아이템번호행들(request, 토큰, 저장번호);
      const 첫행 = await verify('첫 행의 saveData 가 보낸 값이다', 행들[0]?.saveData ?? '', 바꾼저장글);
      const 둘째행 = await verify('둘째 행의 saveData 가 처음 값 그대로다', 행들[1]?.saveData ?? '', 처음저장글);
      await verify('같은 ItemInstanceId 행이 둘일 때 저장하면 첫 행에만 적용된다', 첫행 && 둘째행, true);
    });
    await test.step('같은 ItemInstanceId 행 둘을 만든 뒤 그 번호로 삭제한다', async () => {
      await 아이템만들기(request, 토큰, 삭제번호, 처음저장글);
      await 아이템만들기(request, 토큰, 삭제번호, 처음저장글);
      const 만든행들 = await 같은아이템번호행들(request, 토큰, 삭제번호);
      await verify('삭제할 ItemInstanceId 의 행 수가 기대 결과와 같다', 만든행들.length, expected.행수, { blocker: true });
      await 아이템지우기(request, 토큰, 삭제번호);
      const 행들 = await 같은아이템번호행들(request, 토큰, 삭제번호);
      const 첫행 = await verify('첫 행이 목록에서 사라졌다', 행들.some((x) => x.id === (만든행들[0]?.id ?? 0)), false);
      const 둘째행 = await verify('둘째 행이 목록에 남았다', 행들.some((x) => x.id === (만든행들[1]?.id ?? 0)), true);
      await verify('삭제도 첫 행에만 적용되고 둘째 행은 남는다', 첫행 && 둘째행, true);
    });
  } finally {
    await 아이템모두지우기(request, 토큰, 저장번호);
    await 아이템모두지우기(request, 토큰, 삭제번호);
  }
});
