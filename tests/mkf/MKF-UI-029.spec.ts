import { defineCase, test, verify } from '@platform/kit';

import { 바닥글 } from './components/footer.component.js';
import { 쿠키띠 } from './components/cookie-bar.component.js';
import { 세션아이디, 처음방문인가 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 덮고있나 } from './helpers/board-extra.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-029',
  name: '맨 아래까지 내린 홈에서 쿠키 안내 띠가 바닥글 위를 덮어 보인다',
  precondition: ['쿠키 안내에 동의한 적 없는 비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쿠키 = new 쿠키띠(page);
  const 바닥 = new 바닥글(page);
  const 홈 = new 홈화면(page);
  const 화면 = new 게시판목록화면(page);

  await test.step('쿠키 안내에 동의한 적 없는 비회원인지 확인한다', async () => {
    await verify('브라우저에 저장된 방문 기록이 없다', await 처음방문인가(page), true, { blocker: true });
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('쿠키 안내 띠가 있는 홈을 연다', async () => {
    await 방해막기(page, { 쿠키띠: false });
    await 홈.열기();
    await 쿠키.띠.waitFor();
    await verify('쿠키 안내 띠가 보인다', await 쿠키.띠.isVisible(), true, { blocker: true });
  });

  await test.step('홈을 맨 아래까지 내린다', async () => {
    await 화면.내리기(1_000_000);
    await 바닥.저작권.waitFor();
    await verify('맨 아래까지 내린 홈에서 쿠키 안내 띠가 바닥글 위를 덮어 보인다', await 덮고있나(쿠키.띠, 바닥.영역), true);
  });
});
