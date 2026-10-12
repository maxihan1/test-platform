import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 표식 } from './helpers/board.helper.js';
import { MB, 파일만들기 } from './helpers/files.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 문의화면 } from './pages/support-inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-228',
  name: '10MB 파일을 첨부한 문의는 내 문의 내역에 추가된다',
  techniques: ['경계값 분석'],
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 문의 = new 문의화면(page);
  const 토스 = new 토스트(page);

  try {
    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      await 방해막기(page);
      await 새회원으로로그인(page.request);
    });

    await test.step('새로 가입한 회원으로 로그인했는지 확인한다', async () => {
      await verify('새로 가입한 회원으로 로그인해 있다', (await 세션사용자(page.request)) !== null, true, { blocker: true });
    });

    await test.step('1:1 문의 화면을 연다', async () => {
      await 문의.열기();
      await 문의.제목.waitFor();
      await verify('1:1 문의 화면에 「등록」 버튼이 보인다', await 문의.등록.isVisible(), true, { blocker: true });
    });

    await test.step('10MB 파일을 첨부해 문의를 등록한다', async () => {
      const 접두 = 표식('첨부');
      await 문의.채우기({ 유형: '주문', 제목: 접두, 내용: '문의 내용입니다' });
      await 문의.첨부칸.setInputFiles(파일만들기('열메가.txt', 10 * MB));
      const 응답 = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/inquiries' && r.request().method() === 'POST');
      await 문의.등록.click();
      await 응답;
      await 토스.알림들.first().waitFor();
      await verify('10MB 파일을 첨부한 문의는 내 문의 내역에 추가된다', await 문의.내역행(접두).isVisible(), true);
    });

    await test.step('10MB 를 넘는 파일을 첨부한다', async () => {
      await 토스.알림들.first().waitFor({ state: 'detached' });
      await 문의.첨부칸.setInputFiles(파일만들기('열메가넘음.txt', 10 * MB + 1024));
      await 토스.알림들.first().waitFor();
      await verify('10MB 를 넘는 파일은 첨부되지 않는다', await 문의.선택된파일수(), 0);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
