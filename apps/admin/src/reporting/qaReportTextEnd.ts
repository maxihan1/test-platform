// QA 리포트 첫 장 끝 두 절 — 남은 리스크(AI 글 · 사람이 고친 글) · 승인 (도메인/리포팅 §3.17 「첫 장 — 시안 B 차례」 6 · 7)
// qaReportText.ts 가 300줄을 넘어 떼어 냈다. 시각 · 덩이는 그 파일 것을 쓴다 — 서로 부르지만 함수 안에서만 써서 불러오는 차례가 상관없다

import { 묶음머리 } from './qaReportAiShape.js';
import type { 리포트응답 } from './qaReportDoc.js';
import { 시각, type 덩이 } from './qaReportText.js';

/** 프로젝트 QA 리포트도 같은 글을 「지난 리포트 대비 리스크」 제목으로 쓴다 */
export function 남은리스크(r: Pick<리포트응답, 'ai'>, 제목 = '남은 리스크'): 덩이[] {
  const a = r.ai;
  const 몸: 덩이[] =
    a === null
      ? [{ 꼴: '글', 글: 'AI 문단이 아직 없습니다', 결: '흐림' }]
      : 'failed' in a
        ? [{ 꼴: '글', 글: 'AI 문단을 만들지 못했습니다', 결: '흐림' }]
        : [
            // AI 가 못 써 사람이 처음부터 쓴 글은 「AI 작성」이 아니다
            {
              꼴: '글',
              글: `${a.first === '' ? '직접 작성' : 'AI 작성'}${a.editedBy === null ? '' : `${a.first === '' ? '' : ' · 수정됨'} · ${a.editedBy} · ${a.editedAt === null ? '' : 시각(a.editedAt)}`}`,
              결: '흐림',
            },
            // 글은 줄마다 덩이 하나 — 문단 하나에 넣으면 줄바꿈이 사라진다. 「기능 리스크」 · 「비기능 리스크」 줄은 작은 머리다
            ...a.current
              .split('\n')
              .map((줄) => 줄.trim())
              .filter((줄) => 줄 !== '')
              .map((줄): 덩이 => (줄 === 묶음머리.functional || 줄 === 묶음머리.nonFunctional ? { 꼴: '글', 글: 줄, 결: '머리' } : { 꼴: '글', 글: 줄 })),
          ];
  return [{ 꼴: '절', 글: 제목, 상자: 'AI' }, ...몸];
}

export function 승인(r: 리포트응답): 덩이[] {
  const a = r.approval;
  return [
    { 꼴: '절', 글: '승인', 상자: '승인' },
    a === null
      ? { 꼴: '글', 글: '승인 전', 결: '강조' }
      : { 꼴: '글', 글: `승인됨 · ${a.byName ?? a.by} · ${시각(a.at)} · 버전 ${r.version}${a.late ? ' · 사후 승인' : ''}`, 결: '강조' },
    { 꼴: '글', 글: '승인은 「이 리포트의 시험 범위와 결과를 확인했다」는 뜻이다. 이 리포트의 수행자는 승인하지 못한다', 결: '흐림' },
  ];
}
