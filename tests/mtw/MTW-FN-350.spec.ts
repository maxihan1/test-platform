import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { PNG만들기 } from './helpers/media.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 작성화면 } from './pages/publish.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-350',
  name: '이미지 4개를 첨부하면 첨부 4개가 모두 보인다',
  techniques: ['경계값 분석'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 글쓰기 = new 작성화면(page);

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  await test.step('작성 상자에 이미지 4개를 첨부한다', async () => {
    for (let 번째 = 1; 번째 <= 4; 번째 += 1) {
      await 글쓰기.이미지넣기(await PNG만들기(page, `첨부${String(번째)}.png`, 64, 64, true), 번째);
    }
    await verify('이미지 4개를 첨부하면 첨부 4개가 모두 보인다', await 글쓰기.첨부썸네일들.count(), 4);
  });

  await test.step('다섯째 이미지를 첨부한다', async () => {
    await 글쓰기.파일넣기(await PNG만들기(page, '다섯째.png', 64, 64, true));
    const 떴다 = await 글쓰기.알림.글('파일 업로드 제한에 도달했습니다.').first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('다섯째 이미지에는 「파일 업로드 제한에 도달했습니다.」가 보인다', 떴다, true);
  });
});
