import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-032',
  name: '관심 분야 세 개를 고르면 셋 다 골라진다',
  platforms: ['desktop'],
  precondition: [
    '회원가입 화면을 열었다',
  ],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입화면(page);
  const 알림 = new 토스트(page);

  await 방해막기(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 가입.열기();
    await verify('회원가입 화면에 「가입하기」 버튼이 보인다', await 가입.가입하기버튼.isVisible(), true, { blocker: true });
  });

  await test.step('관심 분야 세 개를 고른다', async () => {
    await 가입.관심체크('패션').check();
    await 가입.관심체크('전자기기').check();
    await 가입.관심체크('도서').check();
    await verify('관심 분야 세 개를 고르면 셋 다 골라진다', await 가입.골라진관심분야(), ['패션', '전자기기', '도서']);
  });

  await test.step('관심 분야 네 번째를 고른다', async () => {
    await 가입.관심체크('식품').click();
    await 알림.모두.first().waitFor();
    await verify(
      '관심 분야 네 번째를 고르면 토스트 「관심 분야는 최대 3개까지 선택할 수 있습니다」 가 보이고 골라지지 않는다',
      { 토스트: await 알림.모두.first().innerText(), 골라짐: await 가입.관심체크('식품').isChecked() },
      { 토스트: '관심 분야는 최대 3개까지 선택할 수 있습니다', 골라짐: false },
    );
  });
});
