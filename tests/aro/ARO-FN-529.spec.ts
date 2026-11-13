import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지치우기 } from './helpers/ops-api.helper.js';
import { 공지화면 } from './pages/notices.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-529',
  name: '「새 공지」 창에 제목과 내용을 적고 「저장」을 누르면 확인 창 없이 토스트 「공지를 저장했습니다」가 뜨고 표에 그 공지가 보인다',
  smoke: true,
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 공지화면(page);
  const 머리글 = '[QA] ARO-FN-529 ';
  const 제목 = `${머리글}${String(Date.now())}`;

  try {
    await test.step('운영자 계정으로 로그인하고 지난 실행의 [QA] 공지를 치운 뒤 「공지」 화면을 연다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 공지치우기(page, 머리글);
      await 화면.열기();
      await verify('「새 공지」 버튼이 보인다', await 화면.새공지버튼.isVisible(), true, { blocker: true });
    });

    await test.step('「새 공지」 창에 [QA] 제목과 내용을 적고 「저장」을 누른다', async () => {
      const 열렸다 = await 화면.새공지열기();
      await verify('「새 공지」 창이 열린다', 열렸다, true, { blocker: true });
      await 화면.적기({ 제목, 내용: `${머리글}내용` });
      await 화면.저장누르기();
      const 떴다 = await 화면.알림.뜰때까지('공지를 저장했습니다');
      const 줄이생겼다 = await 화면.줄(제목).waitFor({ timeout: 10_000 }).then(() => true, () => false);
      const 토스트 = await verify('토스트 「공지를 저장했습니다」가 뜬다', 떴다, true);
      const 확인창없음 = await verify('확인 창이 뜨지 않는다', await 화면.창.상자.isVisible(), false);
      const 표에보임 = await verify('표에 그 공지가 보인다', 줄이생겼다, true);
      await verify('「새 공지」 창에 제목과 내용을 적고 「저장」을 누르면 확인 창 없이 토스트 「공지를 저장했습니다」가 뜨고 표에 그 공지가 보인다', 토스트 && 확인창없음 && 표에보임, true);
    });
  } finally {
    await 공지치우기(page, 머리글);
  }
});
