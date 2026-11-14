import { defineCase, test, verify } from '@platform/kit';

import { 확인창 } from './components/dialog.component.js';
import { 문구가보이나, 서버 } from './helpers/app.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-580',
  name: '초대 링크가 무효면 「유효하지 않은 초대 링크」 안내 창과 입력 창 「이 초대 링크는 유효하지 않습니다.」가 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);
  const 서버화면 = new 서버고르기화면(driver);
  const 창 = new 확인창(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('가입 경로 서버 고르기를 연다', async () => {
    await 시작.누르기('다른서버선택');
    await verify('서버 고르기 입력칸이 보인다', await 서버화면.떴나(), true, { blocker: true });
  });
  await test.step('「초대 링크 입력하기」에 없는 초대 코드 주소를 넣는다', async () => {
    await 서버화면.초대링크누르기();
    await 서버화면.초대주소넣기('https://' + 서버 + '/invite/mtaNoSuchCode');
    await 창.확인누르기();
    const 안내창 = await verify('「유효하지 않은 초대 링크」 안내 창이 보인다', await 문구가보이나(driver, '유효하지 않은 초대 링크', 15_000), true);
    const 입력창 = await verify('입력 창에 「이 초대 링크는 유효하지 않습니다.」가 보인다', await 문구가보이나(driver, '이 초대 링크는 유효하지 않습니다.'), true);
    await verify('초대 링크가 무효면 「유효하지 않은 초대 링크」 안내 창과 입력 창 「이 초대 링크는 유효하지 않습니다.」가 보인다', 안내창 && 입력창, true);
  }, { capture: true });
});
