import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 표식 } from './helpers/board.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 내문의목록, 세션사용자 } from './helpers/shop-tools.helper.js';
import { 문의화면 } from './pages/support-inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-263',
  name: '문의 내용 1000자로 등록하면 「내 문의 내역」에 그 문의가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
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

    await test.step('내용 1000자로 문의를 등록한다', async () => {
      const 접두 = 표식('내용1000');
      await 문의.채우기({ 유형: '주문', 제목: 접두, 내용: '가'.repeat(1000) });
      await 문의.등록.click();
      await 토스.글('문의가 등록되었습니다').first().waitFor();
      await verify('문의 내용 1000자로 등록하면 「내 문의 내역」에 그 문의가 보인다', await 문의.내역행(접두).isVisible(), true);
    });

    await test.step('내용 칸에 1001자를 넣고 문의를 등록한다', async () => {
      const 접두 = 표식('내용1001');
      await 토스.알림들.first().waitFor({ state: 'detached' });
      await 문의.채우기({ 유형: '주문', 제목: 접두, 내용: '가'.repeat(1001) });
      await 문의.등록.click();
      await 토스.글('문의가 등록되었습니다').first().waitFor();
      const 올린것 = (await 내문의목록(page.request)).find((글) => 글.title === 접두);
      await verify('문의 내용 1001자를 넣고 등록하면 내용이 1000자로 등록된다', 올린것?.content.length, 1000);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
