import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지치우기, 새공지 } from './helpers/ops-api.helper.js';
import { 공지화면 } from './pages/notices.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-185',
  name: '[QA] 공지 줄의 「지우기」를 누르면 확인 창 「「<제목>」 공지를 지울까요?」와 「지우기」 · 「닫기」가 보인다',
  precondition: ['[QA] 공지가 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 공지화면(page);
  const 머리글 = '[QA] ARO-UI-185 ';
  const 제목 = `${머리글}${String(Date.now())}`;

  try {
    await test.step('운영자 계정으로 로그인하고 지난 실행의 [QA] 공지를 치운 뒤 [QA] 공지를 만든다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 공지치우기(page, 머리글);
      await 새공지(page, { title: 제목, body: `${머리글}내용`, startsAt: null, endsAt: null, enabled: true });
      await 화면.열기();
      await verify('[QA] 공지가 있다', await 화면.줄(제목).isVisible(), true, { blocker: true });
    });

    await test.step('그 공지 줄의 「지우기」를 누른다', async () => {
      await 화면.지우기버튼(제목).click();
      const 열렸다 = await 화면.창.열릴때까지();
      const 문구 = await verify('확인 창에 「「<제목>」 공지를 지울까요?」가 보인다', 열렸다 && (await 화면.창.본문.innerText()).trim() === `「${제목}」 공지를 지울까요?`, true);
      const 지우기 = await verify('확인 창에 「지우기」 버튼이 보인다', await 화면.창.버튼('지우기').isVisible(), true);
      const 닫기 = await verify('확인 창에 「닫기」 버튼이 보인다', await 화면.창.버튼('닫기').isVisible(), true);
      await verify('[QA] 공지 줄의 「지우기」를 누르면 확인 창 「「<제목>」 공지를 지울까요?」와 「지우기」 · 「닫기」가 보인다', 문구 && 지우기 && 닫기, true);
    });
  } finally {
    await 공지치우기(page, 머리글);
  }
});
