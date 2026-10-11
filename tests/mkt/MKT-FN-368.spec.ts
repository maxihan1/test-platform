import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 파일만들기, MB } from './helpers/files.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 문의화면 } from './pages/support-inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-368',
  name: '11MB 파일을 고르면 토스트 「10MB 이하 파일만 올릴 수 있습니다」가 보인다',
  techniques: ['동등 분할'],
  precondition: ['새로 가입한 회원으로 로그인해 1:1 문의 화면을 열어 두었다'],
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

    await test.step('첨부 파일에 11MB 파일을 고른다', async () => {
      await 문의.첨부칸.setInputFiles(파일만들기('십일메가.txt', 11 * MB));
      await 토스.알림들.first().waitFor();
      await verify('11MB 파일을 고르면 토스트 「10MB 이하 파일만 올릴 수 있습니다」가 보인다', await 토스.글('10MB 이하 파일만 올릴 수 있습니다').first().isVisible(), true);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
