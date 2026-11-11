import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 도메인차단만들기, 도메인차단지우기, 시험도메인 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 연합화면 } from './pages/instances.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-480',
  name: '연합 목록에 맞는 도메인이 없으면 「도메인이 하나도 없습니다.」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 차단한 도메인이 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 연합 = new 연합화면(page);
  const 도메인 = 시험도메인();
  const 없는도메인 = 시험도메인();

  try {
    await test.step('Owner 계정으로 로그인하고 도메인을 차단한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 도메인차단만들기(page, 도메인, '제한');
      await 연합.열기();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 연합.제목.isVisible(), true, { blocker: true });
      await verify('케이스가 차단한 도메인이 있다', await 연합.줄(도메인).isVisible(), true, { blocker: true });
    });

    await test.step('「연합」 화면에서 「도메인」 칸에 없는 도메인을 적고 「검색」을 누른다', async () => {
      await 연합.검색하기(없는도메인);
      await verify('연합 목록에 맞는 도메인이 없으면 「도메인이 하나도 없습니다.」가 보인다', await 연합.비어있음.isVisible(), true);
    });

    await test.step('「연합」 화면에서 그 도메인을 검색한다', async () => {
      await 연합.열기();
      await 연합.검색하기(도메인);
      const 줄 = await verify('그 도메인 줄이 보인다', await 연합.줄(도메인).isVisible(), true);
      const 정책 = await verify('정책이 보인다', await 연합.줄정책(도메인, '제한').isVisible(), true);
      await verify('케이스가 차단한 도메인의 검색 결과에는 그 도메인 줄과 정책이 보인다', 줄 && 정책, true);
    });
  } finally {
    await 도메인차단지우기(page, 도메인);
  }
});
