import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';

import { 시작화면열기 } from './helpers/login.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-013',
  name: '시작 화면에서 「다른 서버 선택하기」를 누르면 가입용 서버 고르기 화면이 열린다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);
  const 고르기 = new 서버고르기화면(driver);

  await test.step('앱을 켜서 시작 화면을 연다', async () => {
    await 시작화면열기(driver);
    await verify('시작 화면 「로그인」 버튼이 보인다', await 시작.그려질때까지(), true, { blocker: true });
  });

  await test.step('시작 화면에서 「다른 서버 선택하기」를 누른다', async () => {
    await 시작.누르기('다른서버선택');
    const 입력칸 = await verify('서버 고르기 입력 칸이 보인다', await 고르기.그려질때까지(), true);
    const 가입용 = await verify('가입용 화면에만 있는 「초대 링크 사용하기」 버튼이 보인다', await 뜰때까지(driver, 고르기.초대링크사용, 10_000), true);
    await verify('시작 화면에서 「다른 서버 선택하기」를 누르면 가입용 서버 고르기 화면이 열린다', 입력칸 && 가입용, true);
  });
});
