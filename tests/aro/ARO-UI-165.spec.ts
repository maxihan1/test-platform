import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지치우기, 새공지 } from './helpers/ops-api.helper.js';
import { 공지화면 } from './pages/notices.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-165',
  name: '[QA] 공지 줄의 「고치기」를 누르면 「공지 #<번호> 고치기」 창이 열린다',
  precondition: ['[QA] 공지가 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 공지화면(page);
  const 머리글 = '[QA] ARO-UI-165 ';
  const 제목 = `${머리글}${String(Date.now())}`;
  let 번호 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 지난 실행의 [QA] 공지를 치운 뒤 [QA] 공지를 만든다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 공지치우기(page, 머리글);
      번호 = await 새공지(page, { title: 제목, body: `${머리글}내용`, startsAt: null, endsAt: null, enabled: true });
      await 화면.열기();
      await verify('[QA] 공지가 있다', await 화면.줄(제목).isVisible(), true, { blocker: true });
    });

    await test.step('그 공지 줄의 「고치기」를 누른다', async () => {
      await 화면.고치기버튼(제목).click();
      const 열렸다 = await 화면.창.열릴때까지();
      await verify('[QA] 공지 줄의 「고치기」를 누르면 「공지 #<번호> 고치기」 창이 열린다', 열렸다 && (await 화면.창.제목.innerText()).trim() === `공지 #${String(번호)} 고치기`, true);
    });
  } finally {
    await 공지치우기(page, 머리글);
  }
});
