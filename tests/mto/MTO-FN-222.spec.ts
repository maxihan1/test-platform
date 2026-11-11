import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 확인창받기 } from './helpers/dialog.helper.js';
import { 도메인차단지우기, 시험도메인, 열초안에결말 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 도메인차단불러오기화면 } from './pages/domain-block-import.page.js';
import { 서버상세화면 } from './pages/instance-detail.page.js';
import { 연합화면 } from './pages/instances.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-222',
  name: 'CSV 로 도메인을 불러오면 그 도메인 서버 상세의 비공개 주석에 「에서 불러옴」이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 연합 = new 연합화면(page);
  const 불러오기 = new 도메인차단불러오기화면(page);
  const 상세 = new 서버상세화면(page);
  const 도메인 = 시험도메인();

  try {
    await test.step('Owner 계정으로 로그인하고 도메인 차단 불러오기 화면을 연다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 불러오기.열기();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 불러오기.제목.isVisible(), true, { blocker: true });
    });

    await test.step('도메인 하나가 든 CSV를 「불러오기」로 올리고 미리 보기에서 확정한다', async () => {
      await 불러오기.올리기(`#domain,#severity\n${도메인},silence\n`);
      const 창 = 확인창받기(page, '확인');
      await 불러오기.불러오기.click();
      await 열초안에결말(창);
      await 연합.제목.waitFor();
      await 상세.열기(도메인);
      await verify('CSV 로 도메인을 불러오면 그 도메인 서버 상세의 비공개 주석에 「에서 불러옴」이 보인다', (await 상세.내부참고사항칸.innerText()).includes('에서 불러옴'), true);
    });
  } finally {
    await 도메인차단지우기(page, 도메인);
  }
});
