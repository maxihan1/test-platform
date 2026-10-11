import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 상품담기 } from './helpers/order-tools.helper.js';
import type { 담은상품 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 장바구니보기, 일요일아닌배송일 } from './helpers/shop.helper.js';
import { 주문서화면, 정상배송값 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-354',
  name: '연락처를 9자로 적고 「다음」을 누르면 「연락처는 숫자 10~11자로 입력하세요」가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['새로 가입한 회원이 상품을 담고 주문서를 열어 두었다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 담음!: 담은상품;
  const 주문서 = new 주문서화면(page);
  const 배송 = 정상배송값(일요일아닌배송일());

  try {
    await test.step('임시 회원으로 가입해 상품을 담는다', async () => {
      await 방해막기(page);
      await 새회원으로로그인(page.request);
      담음 = await 상품담기(page.request, {}, 1);
    });

    await test.step('상품이 담겼는지 확인한다', async () => {
      await verify('장바구니에 담은 상품이 있다', (await 장바구니보기(page.request)).some((줄) => 줄.id === 담음.줄번호), true, { blocker: true });
    });

    await test.step('주문서를 열어 둔다', async () => {
      await 주문서.열기([담음.줄번호]);
    });

    await test.step('주문서 배송 정보 단계가 열렸는지 확인한다', async () => {
      await verify('주문서 배송 정보 단계가 열려 있다', (await 주문서.현재단계글()), '① 배송 정보', { blocker: true });
    });

    await test.step('연락처에 9자를 적고 「다음」을 누른다', async () => {
      await 주문서.배송정보채우기({ ...배송, 연락처: '010123456' });
      await 주문서.다음누르기();
      await verify('연락처를 9자로 적고 「다음」을 누르면 「연락처는 숫자 10~11자로 입력하세요」가 보인다', await 주문서.오류글('연락처는 숫자 10~11자로 입력하세요').isVisible(), true);
    });

    await test.step('연락처에 10자를 적고 「다음」을 누른다', async () => {
      await 주문서.열기([담음.줄번호]);
      await 주문서.배송정보채우기({ ...배송, 연락처: '0101234567' });
      await 주문서.다음누르기();
      await verify('연락처를 10자로 적고 「다음」을 누르면 연락처 오류 글자가 보이지 않는다', (await 주문서.연락처오류.innerText()).trim() === '', true);
    });

    await test.step('연락처에 11자를 적고 「다음」을 누른다', async () => {
      await 주문서.열기([담음.줄번호]);
      await 주문서.배송정보채우기({ ...배송, 연락처: '01012345678' });
      await 주문서.다음누르기();
      await verify('연락처를 11자로 적고 「다음」을 누르면 연락처 오류 글자가 보이지 않는다', (await 주문서.연락처오류.innerText()).trim() === '', true);
    });

    await test.step('연락처에 12자를 넣고 「다음」을 누른다', async () => {
      await 주문서.열기([담음.줄번호]);
      await 주문서.배송정보채우기({ ...배송, 연락처: '010123456789' });
      await 주문서.다음누르기();
      await verify('연락처 칸에 12자를 넣고 「다음」을 누르면 연락처 오류 글자가 보이지 않는다', (await 주문서.연락처오류.innerText()).trim() === '', true);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
