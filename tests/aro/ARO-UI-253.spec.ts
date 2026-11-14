import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 작업기록채우기 } from './helpers/notice-log.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-253',
  name: '「기록」에서 「다음」을 누르면 「2 / N」 쪽으로 간다',
  precondition: ['운영자 작업 기록이 51건 이상이다', '운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 기록화면(page);

  await test.step('운영자 계정으로 로그인해 운영자 작업 기록을 51건 이상으로 채운다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await 작업기록채우기(page, params.loginId ?? '', params.loginPassword ?? '', 51);
  });

  await test.step('「다음」을 누른다', async () => {
    await 화면.열기();
    const 건수 = Number((await 화면.총건수.innerText()).replace(/[^\d]/g, ''));
    await verify('운영자 작업 기록이 51건 이상이다', 건수 >= 51, true, { blocker: true });
    await 화면.다음쪽으로();
    await verify('「기록」에서 「다음」을 누르면 「2 / N」 쪽으로 간다', /^2 \/ \d+$/.test((await 화면.쪽표시.innerText()).trim()), true);
  });

  await test.step('둘째 쪽에서 「이전」을 누른다', async () => {
    await 화면.이전쪽으로();
    await verify('기록 「이전」은 「1 / N」 쪽으로 돌아간다', /^1 \/ \d+$/.test((await 화면.쪽표시.innerText()).trim()), true);
  });

  await test.step('「아이템 흐름」 탭에서 「운영자 작업」 탭을 누른다', async () => {
    await 화면.탭누르기('아이템 흐름');
    await verify('「아이템 흐름」 탭의 표 머리가 보인다', (await 화면.표머리들.allInnerTexts()).join(', '), '시각, 흐름, 캐릭터, 아이템 · 재화, 수량, 재화, 지급 번호, 누가', { blocker: true });
    await 화면.탭누르기('운영자 작업');
    await verify('「운영자 작업」 탭은 운영자 작업 표로 돌아온다', (await 화면.표머리들.allInnerTexts()).join(', '), '시각, 운영자, 메뉴, 작업, 대상, 내용');
  });
});
