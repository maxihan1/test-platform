import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 머리 } from './components/header.component.js';
import { 로그인화면 } from './pages/login.page.js';
import { 회원메인화면 } from './pages/main-member.page.js';

export const spec = defineCase({
  tcId: 'CDY-UI-007',
  name: '로그인 뒤 메인 화면에 타일과 머리글, 로그인 상태의 머리가 보인다',
  precondition: ['서울 계정으로 로그인해 있다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: z.object({
    loginId: z.string().describe('테스트 계정 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('테스트 계정 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 로그인 = new 로그인화면(page);
  const 회원메인 = new 회원메인화면(page);
  const 머리부 = new 머리(page);

  await test.step('로그인 화면에서 테스트 계정으로 로그인한다', async () => {
    await 로그인.연다();
    await 로그인.로그인한다(params.loginId ?? '', params.loginPassword ?? '');
  });

  await test.step('머리의 사용자 이름을 확인한다', async () => {
    await 회원메인.사용자이름.waitFor();
    await verify('머리에 사용자 이름이 보인다', await 회원메인.사용자이름.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 뒤 메인 화면을 연다', async () => {
    await 회원메인.연다();
    await 회원메인.사용자이름.waitFor();
    await verify(
      '메인 화면에 타일 「회원가입」 「로그인」 「교육과정」 「모집공고」 「교육 콘텐츠 알아보기」 「Codyssey 세계관」이 보인다',
      (await 회원메인.보이는타일(['회원가입', '로그인', '교육과정', '모집공고', '교육 콘텐츠 알아보기', 'Codyssey 세계관'])).join(', '),
      '회원가입, 로그인, 교육과정, 모집공고, 교육 콘텐츠 알아보기, Codyssey 세계관',
    );
    await verify('메인 화면에 머리글 「공지사항」이 보인다', await 회원메인.공지사항머리글.isVisible(), true);
    await verify('메인 화면에 머리글 「FAQ」가 보인다', await 회원메인.FAQ머리글.isVisible(), true);
    await verify('메인 화면 머리에 「로그인」 링크가 보이지 않는다', await 머리부.로그인링크.isVisible(), false);
  });
});
