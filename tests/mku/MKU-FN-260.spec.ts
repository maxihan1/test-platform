import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 표식 } from './helpers/board.helper.js';
import { 세션사용자, 내문의목록 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 문의화면 } from './pages/support-inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-260',
  name: '문의 유형을 고르지 않고 「등록」을 누르면 문의가 등록되지 않는다',
  techniques: ['동등 분할'],
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

    await test.step('유형만 고르지 않고 제목 · 내용을 채워 「등록」을 누른다', async () => {
      await 문의.채우기({ 제목: 표식('문의'), 내용: '문의 내용입니다' });
      await 문의.등록.click();
      await 토스.알림들.first().waitFor();
      await verify('문의 유형을 고르지 않고 「등록」을 누르면 문의가 등록되지 않는다', (await 내문의목록(page.request)).length, 0);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
