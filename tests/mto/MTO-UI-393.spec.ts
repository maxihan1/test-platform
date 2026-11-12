import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/api.helper.js';
import { 공지정리, 공지즉시발행 } from './helpers/settings-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 관리화면 } from './pages/admin.page.js';
import { 공지사항폼화면 } from './pages/announcement-form.page.js';
import { 공지사항알림미리보기화면 } from './pages/announcement-preview.page.js';
import { 공지사항화면 } from './pages/announcements.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-393',
  name: '게시된 공지를 누르면 「공지사항 편집」 화면에 「변경 사항을 저장」이 보이고 「발행 일정」 칸은 없다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 즉시 발행한 공지가 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리화면(page);
  const 공지 = new 공지사항화면(page);
  const 폼 = new 공지사항폼화면(page);
  const 글 = 고유이름('mto');
  const 미리보기 = new 공지사항알림미리보기화면(page);

  try {
    await test.step('Owner 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 관리.열기('/admin/dashboard');
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 관리.사이드바.관리.isVisible(), true, { blocker: true });
    });

    await test.step('케이스 공지를 즉시 발행한다', async () => {
      await 공지즉시발행(page, 글);
    });

    await test.step('케이스가 즉시 발행한 공지가 있는지 확인한다', async () => {
      await 공지.열기();
      await verify('케이스가 즉시 발행한 공지가 있다', await 공지.공지줄(글).count(), 1, { blocker: true });
    });

    await test.step('그 공지 본문 링크를 누른다', async () => {
      await 공지.열기();
      await 공지.본문링크(글).click();
      await 폼.본문칸.waitFor();
      const 제목 = await verify('「공지사항 편집」 화면이 열린다', (await 폼.제목.innerText()).trim(), '공지사항 편집');
      const 저장 = await verify('「변경 사항을 저장」이 보인다', await 폼.저장.isVisible(), true);
      const 일정 = await verify('「발행 일정」 칸은 없다', await 폼.발행일정.isVisible(), false);
      await verify('게시된 공지를 누르면 「공지사항 편집」 화면에 「변경 사항을 저장」이 보이고 「발행 일정」 칸은 없다', 제목 && 저장 && 일정, true);
    });

    await test.step('그 공지의 「사용자들에게 알리기」를 누른다', async () => {
      await 공지.열기();
      await 공지.알리기(글).click();
      await 미리보기.제목.waitFor();
      const 발송 = await verify('「건의 메일 발송」 버튼이 보인다', await 미리보기.메일발송.isVisible(), true);
      const 문구 = await verify('「사용자들은 수신설정을 끌 수 없기 때문에」로 시작하는 주의 문구가 보인다', await 미리보기.주의문구.isVisible(), true);
      await verify('「사용자들에게 알리기」를 누르면 「공지사항 알림 미리보기」에 「건의 메일 발송」 버튼과 「사용자들은 수신설정을 끌 수 없기 때문에」로 시작하는 주의 문구가 보인다', 발송 && 문구, true);
    });
  } finally {
    await 공지정리(page, 글);
  }
});
