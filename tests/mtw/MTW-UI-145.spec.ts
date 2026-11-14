import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글경로, 글찾기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/status.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-145',
  name: '글타래 중간 글 상세에 위로 앞 글, 아래로 답글이 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 상세 = new 글상세화면(page);

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  await test.step('seoyeon_books 글타래 둘째 글 상세를 연다', async () => {
    const 둘째 = await 글찾기API(page, 'seoyeon_books', '첫 번째는 장편소설');
    await 상세.글타래열기(글경로(둘째), '(2/3)');
    const 둘째위 = await 상세.세로위치('(2/3)');
    const 앞글위 = await 상세.세로위치('(1/3)');
    const 답글위 = await 상세.세로위치('(3/3)');
    const 앞글 = await verify('앞 글이 위에 보인다', 앞글위 < 둘째위, true);
    const 답글 = await verify('답글이 아래에 보인다', 답글위 > 둘째위, true);
    await verify('글타래 중간 글 상세에 위로 앞 글, 아래로 답글이 보인다', 앞글 && 답글, true);
  });
});
