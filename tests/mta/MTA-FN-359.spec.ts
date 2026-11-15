import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTA-FN-359',
  name: '로그인 없이 해시태그 타임라인 API 를 부르면 응답 코드 200 과 글 목록이 돌아온다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    태그: z.string().min(1).describe('부를 해시태그 — 샵 기호 없는 낱말').default('오늘의사진'),
  }),
  expected: z.object({
    응답코드: z.number().int().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  await test.step('로그인 없이 해시태그 #오늘의사진 공개 API 를 부른다', async () => {
    const 응답 = await request.get('/api/v1/timelines/tag/' + encodeURIComponent(params.태그));
    const 코드 = await verify('응답 코드가 기대값과 같다', 응답.status(), expected.응답코드, { blocker: true });
    const 글들 = (await 응답.json()) as unknown[];
    const 목록 = await verify('돌아온 값이 글 목록이다', Array.isArray(글들), true);
    const 있음 = await verify('글이 1건 이상이다', 글들.length >= 1, true);
    await verify('로그인 없이 해시태그 타임라인 API 를 부르면 응답 코드 200 과 글 목록이 돌아온다', 코드 && 목록 && 있음, true);
  });
});
