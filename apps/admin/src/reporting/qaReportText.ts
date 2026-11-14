// QA 리포트 첫 장을 글 덩이(제목 · 문단 · 표)로 짓는다 — HTML · PDF(qaReportHtml.ts)와 워드(qaReportDocx.ts)가 같은 글을 그린다 (도메인/리포팅 §3.17 「첫 장 — 시안 B 차례」)
// 빈 값을 무엇으로 적을지(「견줄 이전 빌드 없음」 · 「Issue Bunker 미연결」 …)는 여기 한 곳에서 정한다. 형식마다 따로 정하면 HTML 과 워드가 다른 말을 한다

import type { SecRow } from '../perf/judge.js';
import type { 실패유형 } from './failureType.js';
import type { 리포트응답 } from './qaReportDoc.js';
import type { 까닭, 테스트줄 } from './qaReportChanges.js';
import type { 안정화출처, 안정화줄, 첫장 } from './qaReportSummary.js';
import { 남은리스크, 승인 } from './qaReportTextEnd.js';

export interface 표줄 {
  칸: string[];
  /** 묶음 = 표 안의 묶음 머리 줄(기능 검증 · 비기능 검증), 강조 = 기대 결과 변경처럼 먼저 볼 줄 */
  결?: '묶음' | '강조';
}

export type 덩이 =
  /** 상자 — 남은 리스크는 AI 상자, 승인은 점선 상자로 절 몸을 감싼다(HTML) */
  | { 꼴: '절'; 글: string; 상자?: 'AI' | '승인' }
  | { 꼴: '소절'; 글: string }
  /** 「비기능 검증」 구분 머리 — 기능 구획과 비기능 구획 사이 띠 */
  | { 꼴: '구분'; 글: string }
  /** 머리 = 소절 아래 작은 머리(「AI 분석」 · 「트랜잭션별 결과」) */
  | { 꼴: '글'; 글: string; 결?: '흐림' | '강조' | '머리' }
  | {
      꼴: '표';
      머리: string[];
      줄: 표줄[];
      /** 이 칸의 줄은 「<케이스> <판정>」 — HTML 은 판정을 색 칩으로 그린다 */
      판정칸?: number;
      /** 호환성 디바이스 × 화면 격자 — 칸 글(격자칸)마다 색을 입힌다 */
      격자?: true;
    }
  /** E2E 흐름 한 줄 — HTML 은 단계 알약, 워드는 「→」 로 이은 글 */
  | { 꼴: '흐름'; 단계: { 글: string; 판정: string }[] }
  /** 성능 시간대별 추이 — HTML · PDF 는 성능 PDF 와 같은 그림, 워드는 그림 대신 안내 한 줄 */
  | { 꼴: '추이'; rows: SecRow[] };

/** 문서 안 시각은 한 꼴이다 — 받는 사람마다 시간대가 달라 UTC 로 적고 그렇다고 밝힌다 */
export const 시각 = (iso: string): string => `${iso.slice(0, 16).replace('T', ' ')} UTC`;

export const 종류이름 = { FN: '기능', UI: 'UI', E2E: 'E2E', COMPAT: '호환성', PERF: '성능', STAB: '안정화' } as const;
export const 품질특성 = { COMPATIBILITY: '호환성', PERFORMANCE_EFFICIENCY: '성능 효율성', RELIABILITY: '신뢰성' } as const;
export const 디바이스이름: Record<string, string> = { desktop: 'PC', mobile: '모바일', android: 'Android 앱' };

export const 출처이름: Record<안정화출처, string> = {
  WEB_PAGEERROR: '페이지 오류',
  WEB_CONSOLE: '콘솔 오류',
  WEB_NETWORK: '네트워크 오류',
  APP_CRASH: '크래시',
  APP_ANR: 'ANR',
  GAME_EXCEPTION: 'Exception',
  GAME_CRASH: '크래시',
};
// 대시보드 「실패 유형」 이름(web/DashboardTypes.tsx 실패유형이름)과 같은 글자다 — 서버가 화면 모듈을 부르지 않게 옮겨 적었다
const 원인이름: Record<실패유형 | 'stopped' | 'prepFailed', string> = {
  mismatch: '기대 결과 불일치',
  notFound: '요소를 찾지 못함',
  timeout: '타임아웃',
  environment: '환경 오류',
  other: '그 밖',
  stopped: '멈춤',
  prepFailed: '준비 실패',
};
const 분류이름 = { PRODUCT: '제품 결함', TEST: '테스트 문제', ENV: '환경', UNCLASSIFIED: '미분류' } as const;
const 짧은커밋 = (c: string | null): string => (c === null ? '기록 없음' : c.slice(0, 7));

/** 「비기능 검증」 구획의 빈 값 문구 — 첫 장과 같이 여기 한 곳에서 정한다 (QAR-F1-06) */
export const 빈글 = {
  모든화면이상없음: '모든 화면 이상 없음',
  성능목표없음: '판정한 성능 목표가 없습니다',
  AI분석없음: 'AI 분석이 아직 없습니다',
  추이숫자없음: '숫자가 없습니다',
  추이워드: '시간대별 추이 그림은 PDF 에 있습니다',
  오류종류없음: '신규 · 증가 · 재발 오류 없음',
  변화없음: '신규 · 증가 · 재발 없음',
  AI요약없음: 'AI 요약 없음',
  AI요약작성중: 'AI 요약 작성 중',
  AI요약실패: 'AI 요약을 만들지 못했습니다',
  기록없음: '—',
  까닭없음: '까닭 기록 없음',
  진행중: '진행 중',
} as const;

/** 호환성 격자 칸 글 — 판정 전 의심 · 판정한 결함이 「UI 결함 의심 칸」이다(§3.17 결과 요약). 디바이스가 안 지난 화면은 빈글.기록없음 */
export const 격자칸 = { OK: '이상 없음', PENDING: '결함 의심', CONFIRMED: '결함', NOT_DEFECT: '결함 아님', UNCHECKED: '미점검' } as const;

/** 승인한 버전의 HTML · 워드에 다는 말 — 받을 때 다시 만들어 굳힌 PDF 와 지도 · 판이 다를 수 있다 (§3.17 「묶음 · 버전」 승인된 버전의 기준 문서) */
export const 승인뒤다시 = '승인한 기준 문서는 굳힌 PDF 입니다. 이 파일은 받을 때 다시 만들었습니다';

/** 문서 제목 — 빌드가 없으면 실행 하나가 리포트 하나다 */
export function 리포트제목(r: 리포트응답): string {
  const 대상 = r.buildNo !== null ? `빌드 ${r.buildNo}` : r.runId !== null ? `실행 RUN ${r.runId}` : `성능 실행 ${r.perfRunId ?? ''}`;
  return `${r.summary.overview.serviceName} QA 리포트 — ${대상}`;
}

function 개요(r: 리포트응답): 덩이[] {
  const o = r.summary.overview;
  const 빌드 = r.buildNo ?? `빌드 번호 없음 (${r.runId !== null ? `실행 RUN ${r.runId}` : `성능 실행 ${r.perfRunId ?? ''}`})`;
  const 줄 = (k: string, v: string): 표줄 => ({ 칸: [k, v] });
  return [
    { 꼴: '절', 글: '개요' },
    {
      꼴: '표',
      머리: [],
      줄: [
        줄('애플리케이션', o.serviceName),
        줄('대상 서버', `${o.env} · ${o.baseUrl}`),
        줄('빌드', 빌드),
        줄('버전', `버전 ${r.version} · ${r.approval === null ? '승인 전' : '승인됨'}`),
        줄('실행 기간', `${시각(o.startedAt)} ~ ${o.finishedAt === null ? '진행 중' : 시각(o.finishedAt)}`),
        줄('실행', `${o.runs}개${o.running > 0 ? ` · 진행 중인 실행 ${o.running}개` : ''}`),
        줄('수행자', o.performers.length === 0 ? '사람이 시작한 실행 없음' : o.performers.map((p) => p.name || p.username).join(', ')),
        줄('테스트 저장소', o.testsRepo ?? '기록 없음'),
        줄('만든 시각', 시각(r.updatedAt)),
      ],
    },
  ];
}

export function 안정화글(s: 안정화줄 | null): string {
  if (s === null) return '이 빌드로 실행한 정기 실행 없음';
  return [
    `판정은 통과했지만 오류가 난 케이스 ${s.passErrorCases}건 / 기록이 있는 케이스 ${s.cases}건${s.days > 1 ? ` (${s.days}일 중 마지막 날 기준)` : ''}`,
    s.sources.map((x) => `${출처이름[x.source]} 발생 케이스 ${x.cases}건`).join(' · '),
    `잔여 오류 ${s.residual} · 신규 ${s.newErrors} · 재발 ${s.reopened} · 해결 확인 ${s.confirmed}`,
  ]
    .filter((x) => x !== '')
    .join('\n');
}

/** 결과 요약 한 줄의 결과 칸 — 비기능 구획 머리(qaReportSections.ts)도 같은 글을 다시 싣는다 */
export function 결과글(x: 첫장['results']['functional'][number] | 첫장['results']['nonFunctional'][number]): string {
  if (x.result === null) return x.kind === 'STAB' ? 안정화글(null) : '이번 빌드에 실행 없음';
  switch (x.kind) {
    case 'COMPAT':
      return `디바이스 ${x.result.devices}대 · 화면 ${x.result.screens}개 · UI 결함 의심 ${x.result.suspect}곳`;
    case 'PERF':
      return `성능 목표 통과 ${x.result.pass} · 미달 ${x.result.fail} (실행 ${x.result.runs}회)`;
    case 'STAB':
      return 안정화글(x.result);
    default: {
      const v = x.result;
      return `통과 ${v.pass} · 실패 ${v.fail} · 미실행 ${v.notRun}${v.unconfirmed > 0 ? ` (그중 미확정 ${v.unconfirmed}건)` : ''}`;
    }
  }
}

function 결과요약(s: 첫장): 덩이[] {
  return [
    { 꼴: '절', 글: '결과 요약' },
    {
      꼴: '표',
      머리: ['종류', '품질 특성', '결과'],
      줄: [
        { 칸: ['기능 검증'], 결: '묶음' },
        ...s.results.functional.map((x) => ({ 칸: [종류이름[x.kind], '—', 결과글(x)] })),
        { 칸: ['비기능 검증'], 결: '묶음' },
        ...s.results.nonFunctional.map((x) => ({ 칸: [종류이름[x.kind], 품질특성[x.quality], 결과글(x)] })),
      ],
    },
  ];
}

function 까닭글(c: 까닭 | null): string {
  if (c === null) return '사유 기록 없음';
  const 무엇 = { TEST_FIX: `테스트 수정${c.issueKey === null ? '' : ` · ${c.issueKey}`}`, EDIT: '케이스 수정 요청', PRD_APPLY: 'PRD 반영', AUTHOR: '테스트 작성' }[c.kind];
  return `${무엇} (작성 요청 #${c.requestId})${c.prUrl === null ? '' : `\n${c.prUrl}`}`;
}

function 변경사항(s: 첫장): 덩이[] {
  const c = s.changes;
  // 빌드 없는 리포트는 견줄 빌드가 없어 절을 통째로 그리지 않는다 (§3.17 「변경 사항」)
  if (c === null) return [];
  const 덩이들: 덩이[] = [{ 꼴: '절', 글: '변경 사항' }, { 꼴: '소절', 글: '제품' }];
  const p = c.product;
  if (!p.linked) 덩이들.push({ 꼴: '글', 글: 'Issue Bunker 미연결' });
  else if (p.deploys.length === 0) 덩이들.push({ 꼴: '글', 글: '연결된 배포 없음' });
  else {
    덩이들.push({ 꼴: '글', 글: `배포 ${p.deploys.map((d) => `${d.buildNo} (${시각(d.at)})`).join(', ')}` });
    덩이들.push(
      p.issues.length === 0
        ? { 꼴: '글', 글: '이 배포에 든 이슈 없음' }
        : {
            꼴: '표',
            머리: ['이슈', '종류', '제목', 'PR'],
            // PR 제목은 빌 수 있다(Bunker 자동 설정 규칙은 제목을 안 싣는다) — 번호 · 주소만 믿는다
            줄: p.issues.map((i) => ({
              칸: [i.key, i.type === 'BUG' ? '버그' : '작업', i.title ?? '제목 기록 없음', i.prs.length === 0 ? '—' : i.prs.map((x) => `#${x.number}${x.title === '' ? '' : ` ${x.title}`}\n${x.url}`).join('\n')],
            })),
          },
    );
  }

  덩이들.push({ 꼴: '소절', 글: '요구사항' });
  const q = c.requirements;
  if (q === null) 덩이들.push({ 꼴: '글', 글: '견줄 이전 빌드 없음' });
  else {
    덩이들.push({ 꼴: '글', 글: `PRD 버전 ${q.from ?? '없음'} → ${q.to ?? '없음'}` });
    const 줄: 표줄[] = [
      ...q.added.map((x) => ({ 칸: ['신규', x.reqId, x.text] })),
      ...q.changed.map((x) => ({ 칸: ['수정', x.reqId, x.text] })),
      ...q.removed.map((x) => ({ 칸: ['삭제', x.reqId, x.text] })),
    ];
    덩이들.push(줄.length === 0 ? { 꼴: '글', 글: '바뀐 요구사항 없음' } : { 꼴: '표', 머리: ['구분', '요구사항', '문장'], 줄 });
  }

  덩이들.push({ 꼴: '소절', 글: '테스트' });
  const t = c.tests;
  if (t === null) 덩이들.push({ 꼴: '글', 글: '견줄 이전 빌드 없음' });
  else if (!t.recorded) 덩이들.push({ 꼴: '글', 글: '기록 없음' });
  else {
    덩이들.push({ 꼴: '글', 글: `테스트 커밋 ${짧은커밋(t.fromCommit)} → ${짧은커밋(t.toCommit)}` });
    const 케이스 = (x: 테스트줄) => `${x.tcId} ${x.name}`;
    const 기대 = t.modified.filter((x) => x.expected).length;
    if (기대 > 0) 덩이들.push({ 꼴: '글', 글: `기대 결과가 바뀐 케이스 ${기대}건`, 결: '강조' });
    const 줄: 표줄[] = [
      // 기대 결과가 바뀐 줄을 먼저 — 결과가 바뀐 까닭이 제품인지 테스트인지 가르는 첫 단서다
      ...[...t.modified]
        .sort((a, b) => Number(b.expected) - Number(a.expected))
        .map((x): 표줄 => ({
          칸: ['수정', 케이스(x), [x.expected ? '기대 결과 변경' : '', x.file ? '케이스 파일' : ''].filter(Boolean).join(' · '), 까닭글(x.reason)],
          ...(x.expected ? { 결: '강조' as const } : {}),
        })),
      ...t.added.map((x) => ({ 칸: ['신규', 케이스(x), '—', 까닭글(x.reason)] })),
      ...t.removed.map((x) => ({ 칸: ['삭제', 케이스(x), '—', 까닭글(x.reason)] })),
    ];
    덩이들.push(줄.length === 0 ? { 꼴: '글', 글: '바뀐 케이스 없음' } : { 꼴: '표', 머리: ['구분', '케이스', '바뀐 곳', '까닭'], 줄 });
  }
  if (c.confirmed.length > 0) {
    덩이들.push({ 꼴: '소절', 글: '이번 빌드에서 사람이 확인한 케이스' });
    덩이들.push({
      꼴: '표',
      머리: ['케이스', '판정', '판정한 사람', '시각'],
      줄: c.confirmed.map((x) => ({ 칸: [`${x.tcId} (RUN ${x.runId})`, x.verdict === 'BUG' ? '결함' : '화면이 맞음', x.byName, 시각(x.at)] })),
    });
  }
  return 덩이들;
}

function 계획대비차이(s: 첫장): 덩이[] {
  const 덩이들: 덩이[] = [{ 꼴: '절', 글: '계획 대비 차이' }];
  for (const c of s.plan.cases) {
    덩이들.push({ 꼴: '글', 글: `${종류이름[c.kind]} — 활성 케이스 ${c.planned}건 중 ${c.ran}건 실행` });
    const 줄: 표줄[] = [
      ...c.notIncluded.map((x) => ({ 칸: [`${x.tcId} ${x.name}`, '—', '실행에 안 담김 · 사유 기록 없음'] })),
      ...c.notRun.map((x) => ({ 칸: [`${x.tcId} ${x.name}`, 디바이스이름[x.platform] ?? x.platform, `미실행 · ${원인이름[x.cause]}`] })),
    ];
    if (줄.length > 0) 덩이들.push({ 꼴: '표', 머리: ['케이스', '디바이스', '까닭'], 줄 });
  }
  const 안돈것 = [
    ['E2E 시나리오', s.plan.e2e],
    ['호환성 세트', s.plan.compat],
    ['성능 시나리오', s.plan.perf],
  ] as const;
  for (const [이름, 목록] of 안돈것) if (목록.length > 0) 덩이들.push({ 꼴: '글', 글: `이번 빌드에 실행하지 않은 ${이름}: ${목록.join(' · ')}` });
  return 덩이들;
}

function 실패분류(s: 첫장): 덩이[] {
  const f = s.failures;
  const 덩이들: 덩이[] = [{ 꼴: '절', 글: '실패 분류' }];
  if (f.counts.UNCLASSIFIED > 0) 덩이들.push({ 꼴: '글', 글: `판정이 필요한 실패 ${f.counts.UNCLASSIFIED}건`, 결: '강조' });
  // 네 분류를 한 줄로 — 두 칸 세로 표는 이름과 숫자 사이가 벌어져 읽기 어렵다
  const 분류들 = ['PRODUCT', 'TEST', 'ENV', 'UNCLASSIFIED'] as const;
  덩이들.push({ 꼴: '표', 머리: 분류들.map((k) => 분류이름[k]), 줄: [{ 칸: 분류들.map((k) => `${f.counts[k]}건`) }] });
  if (f.items.length === 0) 덩이들.push({ 꼴: '글', 글: '통과하지 못한 케이스 없음' });
  else
    덩이들.push({
      꼴: '표',
      머리: ['케이스', '종류', '디바이스', '분류', '가른 근거'],
      줄: f.items.map((x) => ({
        칸: [
          `${x.tcId} (RUN ${x.runId})`,
          종류이름[x.kind],
          x.platform === null ? '—' : (디바이스이름[x.platform] ?? x.platform),
          분류이름[x.class],
          x.by === 'PERSON' ? '사람 판정' : x.by === 'ISSUE' ? `Issue Bunker ${x.issueKey ?? ''}` : x.by === 'RULE' ? '원인 규칙' : '—',
        ],
      })),
    });
  return 덩이들;
}

/** 첫 장 — 개요 → 결과 요약 → 변경 사항 → 계획 대비 차이 → 실패 분류 → 남은 리스크 → 승인 (§3.17 결정 5). 절에 차례 번호를 단다(시안 B) */
export function 첫장글(r: 리포트응답): 덩이[] {
  let 번호 = 0;
  return [...개요(r), ...결과요약(r.summary), ...변경사항(r.summary), ...계획대비차이(r.summary), ...실패분류(r.summary), ...남은리스크(r), ...승인(r)].map((d) =>
    d.꼴 === '절' ? { ...d, 글: `${++번호}. ${d.글}` } : d,
  );
}
