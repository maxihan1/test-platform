import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';


export const spec = defineCase({
  tcId: 'MTW-FN-802',
  name: '인스턴스 설정 API 를 부르면 첨부 4개 · 투표 기간 최소 300초(5분)로 나온다',
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    첨부수: z.number().describe('첨부 개수 한도').default(4),
    최소기간: z.number().describe('투표 기간 최소(초)').default(300),
  }),
});
test(spec, async ({ request, expected }) => {
  await test.step('인스턴스 설정 API 를 부른다', async () => {
    const 응답 = await request.get('/api/v2/instance');
    await verify('인스턴스 설정 API 가 200 으로 돌아온다', 응답.status(), 200, { blocker: true });
    const 설정 = ((await 응답.json()) as { configuration?: { statuses?: { max_media_attachments?: number }; polls?: { min_expiration?: number; max_expiration?: number } } }).configuration;
    const 첨부 = await verify('첨부 개수 한도가 기대값과 같다', 설정?.statuses?.max_media_attachments, expected.첨부수);
    const 최소 = await verify('투표 기간 최소가 기대값과 같다', 설정?.polls?.min_expiration, expected.최소기간);
    await verify('인스턴스 설정 API 를 부르면 첨부 4개 · 투표 기간 최소 300초(5분)로 나온다', 첨부 && 최소, true);
    const 최대 = 설정?.polls?.max_expiration ?? 0;
    await verify('투표 기간 최대는 28일 이상 31일 이하(약 1개월)다', 최대 >= 28 * 86_400 && 최대 <= 31 * 86_400, true);
  });
});
