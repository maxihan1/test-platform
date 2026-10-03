import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-011',
  name: '회원가입 화면에 입력칸 · 성별 · 관심 분야 · 약관이 기획서대로 보인다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({
    shown: z.boolean().describe('보이는지').default(true),
    dateType: z.string().describe('생년월일 칸 종류').default('date'),
    checked: z.boolean().describe('선택돼 있는지').default(true),
  }),
});

test(spec, async ({ page, expected }) => {
  const 화면 = new 회원가입화면(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 화면.열기();

    const 입력칸 = [화면.이름, 화면.이메일, 화면.휴대폰, 화면.생년월일];
    await verify('회원가입 화면에 이름 · 이메일 · 휴대폰 · 생년월일 칸이 보인다', (await Promise.all(입력칸.map((칸) => 칸.isVisible()))).every(Boolean), expected.shown);

    await verify('생년월일 칸은 날짜 선택기로 보인다', await 화면.입력종류(화면.생년월일), expected.dateType);

    const 성별 = ['선택 안 함', '남성', '여성'].map((이름) => 화면.성별(이름));
    await verify('성별은 「선택 안 함」 · 「남성」 · 「여성」 라디오 버튼으로 보인다', (await Promise.all(성별.map((칸) => 칸.isVisible()))).every(Boolean), expected.shown);

    await verify('성별 기본값은 「선택 안 함」이다', await 화면.성별('선택 안 함').isChecked(), expected.checked);

    const 관심분야 = ['패션', '전자기기', '도서', '식품'].map((이름) => 화면.관심분야(이름));
    await verify('관심 분야는 「패션」 · 「전자기기」 · 「도서」 · 「식품」 체크박스로 보인다', (await Promise.all(관심분야.map((칸) => 칸.isVisible()))).every(Boolean), expected.shown);

    const 약관 = [화면.이용약관, 화면.개인정보, 화면.마케팅];
    await verify('약관은 「(필수) 이용약관 동의」 · 「(필수) 개인정보 수집 동의」 · 「(선택) 마케팅 수신 동의」 세 개로 보인다', (await Promise.all(약관.map((칸) => 칸.isVisible()))).every(Boolean), expected.shown);
  });
});
