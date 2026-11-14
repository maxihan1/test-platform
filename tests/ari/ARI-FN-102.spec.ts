import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유값, 길드들지우기, 길드만들고번호, 길드목록, 길드저장데이터, 서버토큰 } from './helpers/data.helper.js';
import { 길드이름읽기 } from './helpers/save-data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-102',
  name: '길드 목록을 받아 보면 그 길드의 name 칸은 빈 문자열이다',
  apiDoc: 2,
  precondition: ['「게임 서버」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
  }),
  expected: z.object({
    이름칸: z.string().describe('길드 목록의 name 칸').default(''),
  }),
});

test(spec, async ({ request, params, expected }) => {
  let 토큰 = '';
  const 이름 = `qa_tmp_fn102_${고유값()}`;
  const 만든것: number[] = [];
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('GuildName 을 넣은 길드를 만든 뒤 POST /api/getguilds 를 부른다', async () => {
      const 번호 = await 길드만들고번호(request, 토큰, 길드저장데이터(이름));
      if (번호 > 0) 만든것.push(번호);
      await verify('길드를 만든 응답의 id 가 1 이상의 정수다', Number.isInteger(번호) && 번호 > 0, true, { blocker: true });
      const 행 = (await 길드목록(request, 토큰)).find((g) => g.id === 번호);
      await verify('길드 목록에 만든 길드가 보인다', 행 !== undefined, true, { blocker: true });
      const 빈칸 = await verify('길드 목록의 그 길드 name 칸 값이 기대 결과와 같다', 행?.name ?? '(칸 없음)', expected.이름칸);
      await verify('길드 목록을 받아 보면 그 길드의 name 칸은 빈 문자열이다', 빈칸, true);
      const 저장칸 = await verify('saveData 안의 GuildName 이 만든 길드 이름과 같다', 길드이름읽기(행?.saveData ?? ''), 이름);
      await verify('길드 이름은 saveData 안의 GuildName 에만 들어 있다', 저장칸 && 빈칸, true);
    });
  } finally {
    await 길드들지우기(request, 토큰, 만든것);
  }
});
