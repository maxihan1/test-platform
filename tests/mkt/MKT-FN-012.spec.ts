import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 모달 } from './components/modal.component.js';
import { 일부막기 } from './helpers/home.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-012',
  name: '공지 팝업은 0.3초 동안 서서히 나타난다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  const 창 = new 모달(page);

  await test.step('홈 화면을 열어 공지 팝업을 띄운다', async () => {
    await 일부막기(page, { 쿠키: true, 설문: true });
    await 홈.열기();
    await 창.창.waitFor();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await verify('공지 팝업이 보인다', await 창.제목.innerText(), '공지사항', { blocker: true });
    await verify('공지 팝업은 0.3초 동안 서서히 나타난다', await 홈.공지열림전환읽기(), { 속성: 'opacity', 시간: '0.3s' });
  });

  await test.step('공지 팝업의 「닫기」 를 누른다', async () => {
    const 전환 = await 홈.공지닫으며전환읽기();
    await verify('공지 팝업을 닫으면 0.3초 동안 서서히 사라진다', 전환, { 속성: 'opacity', 시간: '0.3s', 닫는중: true });
    await 창.창.waitFor({ state: 'detached' });
  });
});
