import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'CDY-029',
  name: '바닥글의 「이용약관」·「개인정보처리방침」 링크와 문의 메일 링크가 각 주소로 이어진다',
  precondition: ['비회원으로 홈에 들어와 있다'],
  params: null,
  expected: z.object({
    termsHref: z.string().describe('「이용약관」 링크 주소').default('/terms/service'),
    privacyHref: z.string().describe('「개인정보처리방침」 링크 주소').default('/terms/privacy'),
    qnaHref: z.string().describe('교육관련문의 메일 링크 주소').default('mailto:qna@codyssey.kr'),
    communicationHref: z.string().describe('제휴제안 메일 링크 주소').default('mailto:communication@codyssey.kr'),
  }),
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page, expected }) => {
  await test.step('홈을 연다', async () => {
    await page.goto('/');
    const 바닥 = page.getByRole('contentinfo');
    await 바닥.getByRole('link', { name: '이용약관', exact: true }).waitFor();
    const 주소 = async (이름: string) => (await 바닥.getByRole('link', { name: 이름, exact: true }).getAttribute('href')) ?? '';
    await verify(
      '바닥글의 「이용약관」·「개인정보처리방침」 링크와 문의 메일 링크가 각 주소로 이어진다',
      {
        termsHref: await 주소('이용약관'),
        privacyHref: await 주소('개인정보처리방침'),
        qnaHref: await 주소('qna@codyssey.kr'),
        communicationHref: await 주소('communication@codyssey.kr'),
      },
      {
        termsHref: expected.termsHref,
        privacyHref: expected.privacyHref,
        qnaHref: expected.qnaHref,
        communicationHref: expected.communicationHref,
      },
    );
  });
});
