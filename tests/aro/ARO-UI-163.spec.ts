import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지치우기, 새공지 } from './helpers/ops-api.helper.js';
import { 공지화면 } from './pages/notices.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-163',
  name: '「공지」 화면에 안내 「켜져 있고 기간 안인 공지만 게임 로그인 화면 · 접속 중 알림에 나갑니다.」와 「새 공지」 버튼이 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 공지화면(page);
  const 머리글 = '[QA] ARO-UI-163 ';
  const 제목 = `${머리글}${String(Date.now())}`;

  try {
    await test.step('운영자 계정으로 로그인하고 지난 실행의 [QA] 공지를 치운 뒤 표에 보일 [QA] 공지를 만든다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await 공지치우기(page, 머리글);
      await 새공지(page, { title: 제목, body: `${머리글}내용`, startsAt: null, endsAt: null, enabled: true });
    });

    await test.step('「공지」 화면을 연다', async () => {
      await 화면.열기();
      await verify('[QA] 공지 줄이 공지 표에 보인다', await 화면.줄(제목).isVisible(), true, { blocker: true });
      const 안내 = await verify('안내 「켜져 있고 기간 안인 공지만 게임 로그인 화면 · 접속 중 알림에 나갑니다.」가 보인다', await 화면.안내.isVisible(), true);
      const 버튼 = await verify('「새 공지」 버튼이 보인다', await 화면.새공지버튼.isVisible(), true);
      await verify('「공지」 화면에 안내 「켜져 있고 기간 안인 공지만 게임 로그인 화면 · 접속 중 알림에 나갑니다.」와 「새 공지」 버튼이 보인다', 안내 && 버튼, true);
    });

    await test.step('공지 표 머리를 본다', async () => {
      await verify('공지 표에 열 「번호」 · 「제목」 · 「기간」 · 「상태」 · 「켜기」 · 「고친 시각」이 보인다', (await 화면.표머리들.allInnerTexts()).join(', '), '번호, 제목, 기간, 상태, 켜기, 고친 시각');
    });
  } finally {
    await 공지치우기(page, 머리글);
  }
});
