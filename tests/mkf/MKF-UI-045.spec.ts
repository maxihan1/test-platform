import { defineCase, test, verify } from '@platform/kit';

import { 보이는이름들, 세션아이디, 처음방문인가 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-045',
  name: '공지 팝업에 「닫기」 버튼과 「오늘 하루 보지 않기」 체크박스가 보인다',
  precondition: ['공지 팝업을 닫은 적 없는 비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('공지 팝업을 닫은 적 없는지 확인한다', async () => {
    await verify('브라우저에 저장된 방문 기록이 없다', await 처음방문인가(page), true, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 방해막기(page, { 공지팝업: false });
    await 홈.열기();
    await 홈.공지창.waitFor();
    await verify(
      '공지 팝업에 「닫기」 버튼과 「오늘 하루 보지 않기」 체크박스가 보인다',
      await 보이는이름들({ '「닫기」 버튼': 홈.공지닫기, '「오늘 하루 보지 않기」 체크박스': 홈.공지하루안봄 }),
      '「닫기」 버튼, 「오늘 하루 보지 않기」 체크박스',
    );
  });
});
