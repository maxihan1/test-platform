import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 분류들, 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-030',
  name: '상품 목록에 분류 칩 「전체」 · 「패션」 · 「전자기기」 · 「도서」 · 「식품」이 가로로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 상품 목록이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('분류 칩을 확인한다', async () => {
    const 이름들: string[] = [];
    const 세로: number[] = [];
    const 가로: number[] = [];
    for (const 이름 of 분류들) {
      이름들.push(await 목록.분류칩이름(이름));
      세로.push(await 목록.분류칩세로자리(이름));
      가로.push(await 목록.분류칩가로자리(이름));
    }
    const 글 = await verify('분류 칩이 「전체」 · 「패션」 · 「전자기기」 · 「도서」 · 「식품」 차례로 보인다', 이름들.join(' · '), '전체 · 패션 · 전자기기 · 도서 · 식품');
    const 한줄 = await verify(
      '분류 칩이 한 줄에 가로로 놓인다',
      세로.every((y) => y === 세로[0]) && 가로.every((x, 번) => 번 === 0 || x > (가로[번 - 1] ?? 0)),
      true,
    );
    await verify('상품 목록에 분류 칩 「전체」 · 「패션」 · 「전자기기」 · 「도서」 · 「식품」이 가로로 보인다', 글 && 한줄, true);
  });

  await test.step('처음 골라진 분류 칩을 확인한다', async () => {
    await verify('처음에는 「전체」 칩이 골라져 있다', await 목록.분류칩골라졌나('전체'), true);
  });
});
