import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-036',
  name: '가입 화면의 휴대폰 · 관심 분야 · 약관 칸이 입력 규칙대로 움직인다',
  precondition: ['비회원이다', '회원가입 화면이 열려 있다', '약관 셋이 모두 체크돼 있다'],
  params: z.object({
    mixedPhone: z.string().min(1).describe('글자와 숫자를 섞은 휴대폰 값').default('01a2b3-4'),
  }),
  expected: z.object({
    phoneDigits: z.string().describe('숫자만 남은 휴대폰 값').default('01234'),
    limitToast: z.string().describe('관심 분야 제한 토스트').default('관심 분야는 최대 3개까지 선택할 수 있습니다'),
    shown: z.boolean().describe('토스트가 보이는지').default(true),
    checked: z.boolean().describe('선택돼 있는지').default(true),
    unchecked: z.boolean().describe('선택돼 있는지').default(false),
    allChecked: z.string().describe('약관 셋의 선택 상태').default('true, true, true'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 회원가입화면(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 화면.열기();
  });

  await test.step('휴대폰 칸에 글자와 숫자를 섞어 적는다', async () => {
    await 화면.휴대폰.fill(params.mixedPhone);
    await verify('휴대폰 칸에는 숫자 외의 글자가 입력되지 않는다', await 화면.입력값(화면.휴대폰), expected.phoneDigits);
  });

  await test.step('관심 분야 체크박스를 네 개 차례로 누른다', async () => {
    for (const 이름 of ['패션', '전자기기', '도서', '식품']) {
      await 화면.관심분야(이름).click();
    }
    await verify('관심 분야 네 번째를 고르면 토스트 「관심 분야는 최대 3개까지 선택할 수 있습니다」가 보인다', await 화면.토스트문구(expected.limitToast).isVisible(), expected.shown);
    await verify('관심 분야 네 번째 체크박스는 선택되지 않는다', await 화면.관심분야('식품').isChecked(), expected.unchecked);
  });

  await test.step('「전체 동의」를 체크한다', async () => {
    await 화면.전체동의.check();
    const 상태 = await Promise.all([화면.이용약관, 화면.개인정보, 화면.마케팅].map((칸) => 칸.isChecked()));
    await verify('「전체 동의」를 체크하면 약관 셋이 모두 체크된다', 상태.join(', '), expected.allChecked);
  });

  await test.step('약관 하나를 해제한다', async () => {
    await 화면.마케팅.uncheck();
    await verify('약관 셋 중 하나라도 해제하면 「전체 동의」도 해제된다', await 화면.전체동의.isChecked(), expected.unchecked);
  });
});
