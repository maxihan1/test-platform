import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지치우기, 새공지 } from './helpers/ops-api.helper.js';
import { 공지화면 } from './pages/notices.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-556',
  name: '확인 창에서 「지우기」를 누르면 토스트 「공지를 지웠습니다」가 뜬다',
  precondition: ['[QA] 공지가 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 공지화면(page);
  const 머리글 = '[QA] ARO-FN-556 ';
  const 제목 = `${머리글}${String(Date.now())}`;

  try {
    await test.step('운영자 계정으로 로그인하고 지난 실행의 [QA] 공지를 치운다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 공지치우기(page, 머리글);
    });

    await test.step('API 로 [QA] 공지를 만들고 「공지」를 연다', async () => {
      await 새공지(page, { title: 제목, body: `${머리글}내용`, startsAt: null, endsAt: null, enabled: true });
      await 화면.열기();
      await verify('[QA] 공지가 있다', await 화면.줄(제목).isVisible(), true, { blocker: true });
    });

    await test.step('그 공지를 「지우기」로 지운다', async () => {
      await 화면.지우기버튼(제목).click();
      const 열렸다 = await 화면.창.열릴때까지();
      await verify('지우기 확인 창이 열린다', 열렸다, true, { blocker: true });
      await 화면.창.누르기('지우기');
      const 떴다 = await 화면.알림.뜰때까지('공지를 지웠습니다');
      await verify('확인 창에서 「지우기」를 누르면 토스트 「공지를 지웠습니다」가 뜬다', 떴다, true);
    });

    await test.step('공지 표를 본다', async () => {
      const 사라졌다 = await 화면.줄(제목).waitFor({ state: 'hidden', timeout: 10_000 }).then(() => true, () => false);
      await verify('지운 공지는 공지 표에 보이지 않는다', 사라졌다, true);
    });
  } finally {
    await 공지치우기(page, 머리글);
  }
});
