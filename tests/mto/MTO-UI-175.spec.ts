import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 도메인차단폼화면 } from './pages/domain-block-new.page.js';
import { 연합화면 } from './pages/instances.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-175',
  name: '도메인 차단 추가 폼에 「도메인」 · 「심각도」(기본 「제한」) · 체크박스 셋 · 「비공개 주석」 · 「공개 주석」 · 「차단 추가」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 연합 = new 연합화면(page);
  const 폼 = new 도메인차단폼화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 연합.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 연합.제목.isVisible(), true, { blocker: true });
  });

  await test.step('「연합」 화면에서 「도메인 차단 추가하기」를 누른다', async () => {
    await 연합.도메인차단추가하기.click();
    await 폼.제목.waitFor();
    const 도메인 = await verify('「도메인」 칸이 보인다', await 폼.도메인칸.isVisible(), true);
    const 심각도 = await verify('「심각도」가 보인다', await 폼.심각도.isVisible(), true);
    const 기본 = await verify('심각도 기본값이 「제한」이다', await 폼.심각도기본값(), '제한');
    const 미디어 = await verify('「미디어 파일 거부하기」 체크박스가 보인다', await 폼.미디어파일거부.isVisible(), true);
    const 신고 = await verify('「신고 거부」 체크박스가 보인다', await 폼.신고거부.isVisible(), true);
    const 난독화 = await verify('「도메인 이름 난독화」 체크박스가 보인다', await 폼.도메인이름난독화.isVisible(), true);
    const 비공개 = await verify('「비공개 주석」이 보인다', await 폼.비공개주석.isVisible(), true);
    const 공개 = await verify('「공개 주석」이 보인다', await 폼.공개주석.isVisible(), true);
    const 추가 = await verify('「차단 추가」가 보인다', await 폼.차단추가.isVisible(), true);
    await verify('도메인 차단 추가 폼에 「도메인」 · 「심각도」(기본 「제한」) · 체크박스 셋 · 「비공개 주석」 · 「공개 주석」 · 「차단 추가」가 보인다', 도메인 && 심각도 && 기본 && 미디어 && 신고 && 난독화 && 비공개 && 공개 && 추가, true);
  });
});
