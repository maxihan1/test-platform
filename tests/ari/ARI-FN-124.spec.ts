import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 본문JSON } from './helpers/api.helper.js';
import { 데이터부르기, 새아이템번호, 서버토큰, 아이템만들기, 아이템모두지우기, 아이템저장데이터 } from './helpers/data.helper.js';
import type { 저장행 } from './helpers/data.helper.js';
import { 다른아이템번호 } from './helpers/mail.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-124',
  name: '아이템 인스턴스 목록을 부르면 200 과 만든 둘이 다 들어 있다',
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
  const 첫번호 = 새아이템번호();
  const 둘째번호 = 다른아이템번호(첫번호);
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('아이템 인스턴스 둘을 만든 뒤 POST /api/getiteminstances 를 부른다', async () => {
      const 첫응답 = await 아이템만들기(request, 토큰, 첫번호, 아이템저장데이터('qa_tmp_item_fn124_a'));
      await verify('첫째 아이템 인스턴스를 만들었다', 첫응답.status(), 200, { blocker: true });
      const 둘째응답 = await 아이템만들기(request, 토큰, 둘째번호, 아이템저장데이터('qa_tmp_item_fn124_b'));
      await verify('둘째 아이템 인스턴스를 만들었다', 둘째응답.status(), 200, { blocker: true });
      const 응답 = await 데이터부르기(request, 토큰, 'getiteminstances');
      const 행들 = 응답.ok() ? (await 본문JSON<{ itemInstances: 저장행[] }>(응답)).itemInstances : [];
      const 코드 = await verify('POST /api/getiteminstances 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
      const 첫째 = await verify('목록에 첫째 아이템 인스턴스가 있다', 행들.some((x) => x.itemInstanceId === 첫번호), true);
      const 둘째 = await verify('목록에 둘째 아이템 인스턴스가 있다', 행들.some((x) => x.itemInstanceId === 둘째번호), true);
      await verify('아이템 인스턴스 목록을 부르면 200 과 만든 둘이 다 들어 있다', 코드 && 첫째 && 둘째, true);
    });
  } finally {
    await 아이템모두지우기(request, 토큰, 첫번호);
    await 아이템모두지우기(request, 토큰, 둘째번호);
  }
});
