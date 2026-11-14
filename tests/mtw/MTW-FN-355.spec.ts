import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';


export const spec = defineCase({
  tcId: 'MTW-FN-355',
  name: '인스턴스 설정 API 를 부르면 이미지 크기 한도 16MB · 영상 크기 한도 103,809,024바이트로 나온다',
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    이미지한도: z.number().describe('이미지 크기 한도(바이트) — 16MB').default(16_777_216),
    영상한도: z.number().describe('영상 크기 한도(바이트)').default(103_809_024),
  }),
});
test(spec, async ({ request, expected }) => {
  await test.step('인스턴스 설정 API 를 부른다', async () => {
    const 응답 = await request.get('/api/v2/instance');
    await verify('인스턴스 설정 API 가 200 으로 돌아온다', 응답.status(), 200, { blocker: true });
    const 첨부 = ((await 응답.json()) as { configuration?: { media_attachments?: { image_size_limit?: number; video_size_limit?: number } } }).configuration?.media_attachments;
    const 이미지 = await verify('이미지 크기 한도가 기대값과 같다', 첨부?.image_size_limit, expected.이미지한도);
    const 영상 = await verify('영상 크기 한도가 기대값과 같다', 첨부?.video_size_limit, expected.영상한도);
    await verify('인스턴스 설정 API 를 부르면 이미지 크기 한도 16MB · 영상 크기 한도 103,809,024바이트로 나온다', 이미지 && 영상, true);
  });
});
