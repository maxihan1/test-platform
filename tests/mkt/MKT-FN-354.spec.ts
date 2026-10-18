import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 세션회원있는가, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 회원과주문정리 } from './helpers/my-page.helper.js';
import { 문의화면 } from './pages/inquiry.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-354',
  name: '10MB 파일을 첨부하면 첨부 파일 칸에 그 파일이 남는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: z.object({
    한도크기: z.number().int().describe('첨부할 파일 크기(바이트) — 10MB 이하').default(10 * 1024 * 1024),
    초과크기: z.number().int().describe('첨부할 파일 크기(바이트) — 10MB 초과').default(10 * 1024 * 1024 + 1),
  }),
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page, params }) => {
  const 문의 = new 문의화면(page);
  const 알림 = new 토스트(page);
  const 준비: { 회원?: 회원정보 } = {};

  try {
    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      await 방해창막기(page);
      준비.회원 = await 새회원으로로그인(page.request);
    });

    await test.step('로그인한 상태를 확인한다', async () => {
      await verify('세션에 회원이 있다', await 세션회원있는가(page.request), true, { blocker: true });
    });

    await test.step('1:1 문의 화면을 연다', async () => {
      await 문의.열기();
    });

    await test.step('1:1 문의 화면이 열렸는지 확인한다', async () => {
      await verify('첨부 파일 칸이 비어 있다', await 문의.첨부파일수(), 0, { blocker: true });
    });

    await test.step('10MB 파일을 첨부한다', async () => {
      await 문의.파일첨부하기(params.한도크기);
      await verify('10MB 파일을 첨부하면 첨부 파일 칸에 그 파일이 남는다', await 문의.첨부파일수(), 1);
    });

    await test.step('10MB 를 조금 넘는 파일을 첨부한다', async () => {
      await 문의.파일첨부하기(params.초과크기);
      await 알림.뜰때까지('10MB 이하 파일만 올릴 수 있습니다');
      await verify('10MB 를 넘는 파일을 첨부하면 첨부 파일 칸이 비어 있다', await 문의.첨부파일수(), 0);
    });
  } finally {
    await 회원과주문정리(page.request, 준비.회원);
  }
});
