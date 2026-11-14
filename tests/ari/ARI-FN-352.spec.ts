import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유값, 길드들지우기, 길드만들기, 길드목록, 번호받기, 서버토큰 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-352',
  name: 'JSON 이 아닌 글자를 SaveData 로 저장하면 보낸 글자 그대로 돌려준다',
  apiDoc: 2,
  precondition: ['「게임 서버」 계정이 있다'],
  params: z.object({
    serverPassword: z.string().describe('게임 서버 공유 비밀').optional().meta({ secret: true, account: '게임 서버' }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  let 토큰 = '';
  const 글 = `qa_tmp 이것은 JSON 이 아닌 글자 ${고유값()}`;
  const 만든것: number[] = [];
  await test.step('맞는 공유 비밀로 게임 서버 토큰을 받는다', async () => {
    const 받음 = await 서버토큰(request, params.serverPassword ?? '');
    토큰 = 받음.token;
    await verify('게임 서버 로그인 응답 코드가 200 이다', 받음.status, 200, { blocker: true });
  });
  try {
    await test.step('JSON 이 아닌 글자를 SaveData 로 넣어 길드를 만든 뒤 POST /api/getguilds 를 부른다', async () => {
      const 번호 = await 번호받기(await 길드만들기(request, 토큰, 글));
      if (번호 > 0) 만든것.push(번호);
      await verify('POST /api/createguild 로 길드가 만들어졌다', 번호 > 0, true, { blocker: true });
      const 찾음 = (await 길드목록(request, 토큰)).find((길드) => 길드.id === 번호);
      await verify('길드 목록에서 만든 길드를 찾았다', 찾음 !== undefined, true, { blocker: true });
      await verify('JSON 이 아닌 글자를 SaveData 로 저장하면 보낸 글자 그대로 돌려준다', 찾음?.saveData === 글, true);
    });
  } finally {
    await 길드들지우기(request, 토큰, 만든것);
  }
});
