import { defineCase, test, verify } from '@platform/kit';

import { 새창열기 } from './helpers/page-setup.helper.js';
import { 로그인전화면 } from './pages/landing.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-876',
  name: '자바스크립트를 끈 채 열면 「마스토돈을 사용하기 위해서는 자바스크립트를 켜 주십시오. 아니면 네이티브 앱 중 하나를 사용할 수 있습니다.」가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  await test.step('자바스크립트를 끈 브라우저로 로그인 전 화면을 연다', async () => {
    const 손님 = await 새창열기(page, { 자바스크립트: false });
    try {
      const 전 = new 로그인전화면(손님.page);
      await 전.이동();
      await verify('로그인 전 화면 주소가 열려 있다', new URL(손님.page.url()).pathname, '/', { blocker: true });
      await verify(
        '자바스크립트를 끈 채 열면 「마스토돈을 사용하기 위해서는 자바스크립트를 켜 주십시오. 아니면 네이티브 앱 중 하나를 사용할 수 있습니다.」가 보인다',
        (await 전.스크립트안내.innerText()).trim(),
        '마스토돈을 사용하기 위해서는 자바스크립트를 켜 주십시오. 아니면 네이티브 앱 중 하나를 사용할 수 있습니다.',
      );
    } finally {
      await 손님.창묶음.close();
    }
  });
});
