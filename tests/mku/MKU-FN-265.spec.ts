import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 파일만들기, MB } from './helpers/files.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 문의화면 } from './pages/support-inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-265',
  name: '10MB 파일을 고르면 첨부 파일로 들어간다',
  techniques: ['경계값 분석'],
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 문의 = new 문의화면(page);
  const 토스 = new 토스트(page);

  try {
    await test.step('방해 요소를 막고 새 회원으로 로그인한다', async () => {
      await 방해막기(page);
      await 새회원으로로그인(page.request);
    });

    await test.step('로그인한 회원인지 확인한다', async () => {
      await verify('로그인한 회원이 있다', (await 세션사용자(page.request)) !== null, true, { blocker: true });
    });

    await test.step('1:1 문의 화면을 준비한다', async () => {
      await 문의.열기();
    });

    await test.step('1:1 문의 화면이 열렸는지 확인한다', async () => {
      await 문의.제목.waitFor();
      await verify('1:1 문의 화면에 「등록」 버튼이 보인다', await 문의.등록.isVisible(), true, { blocker: true });
    });

    await test.step('첨부 파일로 10MB 파일을 고른다', async () => {
      await 문의.첨부칸.setInputFiles(파일만들기('열메가.txt', 10 * MB));
      await verify('10MB 파일을 고르면 첨부 파일로 들어간다', await 문의.선택된파일수(), 1);
    });

    await test.step('첨부 파일로 10MB 를 조금 넘는 파일을 고른다', async () => {
      await 문의.첨부칸.setInputFiles(파일만들기('열메가넘음.txt', 10 * MB + 1024));
      await 토스.알림들.first().waitFor();
      await verify('10MB 를 넘는 파일을 고르면 첨부 파일로 들어가지 않는다', await 문의.선택된파일수(), 0);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
