import { defineCase, test, verify } from '@platform/kit';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-568',
  name: '로그인 경로에 없는 도메인 「nohost.maxihan.invalid」를 적고 「다음」을 누르면 서버를 찾을 수 없으면(도메인 오류 · 오프라인) 「서버에 도달할 수 없습니다. 연결을 확인하고 재시도해주시겠어요?」가 보인다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);
  const 서버화면 = new 서버고르기화면(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('로그인 경로 서버 고르기를 연다', async () => {
    await 시작.누르기('로그인');
    await verify('서버 고르기 입력칸이 보인다', await 서버화면.떴나(), true, { blocker: true });
  });
  await test.step('로그인 경로에 없는 도메인 「nohost.maxihan.invalid」를 적고 「다음」을 누른다', async () => {
    await 서버화면.입력하고카드고르기('nohost.maxihan.invalid', 'nohost.maxihan.invalid');
    await 서버화면.다음누르기();
    await verify('로그인 경로에 없는 도메인 「nohost.maxihan.invalid」를 적고 「다음」을 누르면 서버를 찾을 수 없으면(도메인 오류 · 오프라인) 「서버에 도달할 수 없습니다. 연결을 확인하고 재시도해주시겠어요?」가 보인다', await 문구가보이나(driver, '서버에 도달할 수 없습니다. 연결을 확인하고 재시도해주시겠어요?', 30_000), true);
  }, { capture: true });
});
