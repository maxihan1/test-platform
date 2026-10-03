import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-018',
  name: '관심 분야를 4개 고르면 최대 3개 안내 토스트가 보이고 4번째는 선택되지 않는다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);
  const 알림 = new 토스트(page);

  await test.step('관심 분야 「패션」 「전자기기」 「도서」를 고른 뒤 「식품」을 고른다', async () => {
    await 화면.열기();
    await 화면.가입하기버튼().waitFor();
    await 화면.관심분야고르기('패션');
    await 화면.관심분야고르기('전자기기');
    await 화면.관심분야고르기('도서');
    await 화면.관심분야고르기('식품');
    await 알림.문구('관심 분야는 최대 3개까지 선택할 수 있습니다').waitFor();
    await verify('관심 분야 4번째를 고르면 토스트 「관심 분야는 최대 3개까지 선택할 수 있습니다」가 보인다', await 알림.문구('관심 분야는 최대 3개까지 선택할 수 있습니다').isVisible(), true);
    await verify('4번째로 고른 관심 분야는 선택되지 않는다', await 화면.관심분야체크('식품').isChecked(), false);
  });
});
