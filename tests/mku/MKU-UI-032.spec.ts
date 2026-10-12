import { defineCase, test, verify } from '@platform/kit';

import { 쿠키띠 } from './components/cookie-bar.component.js';
import { 내용위에겹쳤나, 처음방문인가 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';

export const spec = defineCase({
  tcId: 'MKU-UI-032',
  name: '동의하기 전에는 쿠키 안내 띠가 화면 아래 내용 위에 겹쳐 보인다',
  precondition: ['처음 방문한 브라우저다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쿠키 = new 쿠키띠(page);

  await test.step('처음 방문한 브라우저인지 확인한다', async () => {
    await verify('브라우저에 저장된 방문 기록이 없다', await 처음방문인가(page), true, { blocker: true });
  });

  await test.step('게시판 목록을 연다', async () => {
    await 방해막기(page, { 쿠키띠: false });
    await page.goto('/board');
    await 쿠키.띠.waitFor();
    await verify('동의하기 전에는 쿠키 안내 띠가 화면 아래 내용 위에 겹쳐 보인다', await 내용위에겹쳤나(쿠키.띠), true);
  });
});
