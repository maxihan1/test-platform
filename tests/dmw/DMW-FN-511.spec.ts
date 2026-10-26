import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 나타나는가, 넉넉한상품, 응답을오류로돌리기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-511',
  name: '장바구니 담기 응답이 서버 오류면 오류 안내가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['오류 추정'],
  precondition: ['일회용 회원으로 로그인해 있다', '장바구니 담기 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 상품상세화면(page);
  const 알림 = new 토스트(page);
  const 상품 = await 넉넉한상품(request, true);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);
  const 풀기 = await 응답을오류로돌리기(page, /\/api\/cart$/, 'POST', 500, { code: 'INTERNAL', message: '서버 오류가 발생했습니다' });

  try {
    await test.step('담기 응답을 서버 오류로 둔 채 「장바구니 담기」를 누른다', async () => {
      await 상세.열기(상품.id);
      await verify('상품 상세에 상품 이름이 보인다', await 상세.제목.innerText(), 상품.name, { blocker: true });
      await 상세.옵션고르기(상품.colors[0], 상품.sizes[0]);
      await 상세.담기();
      const 보임 = await verify('안내 글이 보인다', await 나타나는가(알림.모두.first()), true);
      const 성공아님 = await verify('「장바구니에 담았습니다」가 아니다', await 알림.글('장바구니에 담았습니다').count(), 0);
      await verify('장바구니 담기 응답이 서버 오류면 오류 안내가 보인다', 보임 && 성공아님, true);
    });
  } finally {
    await 풀기();
  }
});
