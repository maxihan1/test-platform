// 프로젝트 QA 리포트를 글 덩이로 짓고 HTML · PDF · 워드로 그린다 — 애플리케이션 리포트와 같은 덩이 · 같은 모양(qaReportHtml.ts · qaReportDocx.ts) (도메인/리포팅 §3.17 「프로젝트 QA 리포트」 · 시안 ④)
// 숫자는 만든 때 굳힌 body 그대로다 — 여기서 다시 세지 않는다. 배포 판단 말은 쓰지 않는다(결정 10)

import { 문단, 워드파일 } from '../prd/docx.js';
import { 문서판 } from './html.js';
import { 안전 } from './htmlItem.js';
import { 짧은날, type 프로젝트리포트응답, type 프로젝트몸 } from './qaProjectReportShape.js';
import { 덩이로 as 워드덩이, 흐린글색 } from './qaReportDocx.js';
import { 리포트스타일, 첫장 } from './qaReportHtml.js';
import { 시각, type 덩이, type 표줄 } from './qaReportText.js';
import { 남은리스크 } from './qaReportTextEnd.js';
import { 결과글, 종류이름, 품질특성 } from './qaReportWords.js';

type 몸 = 프로젝트몸;

const 판정글 = (v: { pass: number; fail: number; notRun: number }) => `통과 ${v.pass} · 실패 ${v.fail} · 미실행 ${v.notRun}`;
const 비율 = (a: number, b: number) => (b === 0 ? '—' : `${Math.round((a / b) * 1000) / 10}%`);
const 요일이름 = ['일', '월', '화', '수', '목', '금', '토'];

/** 세트 반복 한 줄 — 「매일 02:00」 · 「평일 09:00」 · 「월 · 목 18:00」 · 「11/20 한 번 10:00」 */
export function 반복글(s: { at: string; days: number[] | null; onceOn: string | null }): string {
  if (s.onceOn !== null) return `${짧은날(s.onceOn)} 한 번 ${s.at}`;
  const d = [...(s.days ?? [])].sort();
  const 이름 = d.length === 7 ? '매일' : d.join() === '1,2,3,4,5' ? '평일' : d.map((x) => 요일이름[x]).join(' · ');
  return `${이름} ${s.at}`;
}

/** 값이 바뀐 날만 이어 적는다 — 「11/10 7 → 11/12 6 → 11/14 4」. 92일이 한 줄에 다 서지 않게 */
export function 바뀐날글(점들: { day: string; 값: number }[]): string {
  const 남길 = 점들.filter((p, i) => i === 0 || i === 점들.length - 1 || p.값 !== 점들[i - 1]!.값);
  return 남길.map((p) => `${짧은날(p.day)} ${p.값}`).join(' → ');
}

export function 프로젝트리포트제목(r: Pick<프로젝트리포트응답, 'projectName' | 'from' | 'to'>): string {
  return `${r.projectName} QA 리포트 — ${짧은날(r.from)} ~ ${짧은날(r.to)}`;
}

function 개요(r: 프로젝트리포트응답): 덩이[] {
  const b = r.body;
  return [
    { 꼴: '절', 글: '개요' },
    {
      꼴: '표',
      머리: [],
      줄: [
        { 칸: ['프로젝트', r.projectName] },
        { 칸: ['기간', `${r.from} ~ ${r.to} (${b.period.days}일 · ${r.tz})`] },
        { 칸: ['애플리케이션', b.apps.length === 0 ? '없음' : b.apps.map((a) => `${a.name} (${a.prefix})`).join('\n')] },
        { 칸: ['지난 리포트', b.previous === null ? '없음 — 이 프로젝트의 첫 리포트' : `${b.previous.from} ~ ${b.previous.to}`] },
        { 칸: ['만든 때', `${시각(r.createdAt)} · ${r.origin === 'SCHEDULED' ? '정기 자동' : r.createdBy}`] },
      ],
    },
  ];
}

function 앱상태(b: 몸): 덩이[] {
  if (b.apps.length === 0) return [{ 꼴: '절', 글: '애플리케이션별 상태' }, { 꼴: '글', 글: '활성 애플리케이션이 없습니다', 결: '흐림' }];
  const 요약줄: 표줄[] = b.apps.flatMap((a): 표줄[] => {
    const 결과 = a.last === null ? [] : [...a.last.results.functional, ...a.last.results.nonFunctional].filter((x) => x.result !== null);
    const 머리 = a.last === null ? `${a.name} · 기간 안 리포트 없음` : `${a.name} · ${a.last.buildNo === null ? `리포트 ${a.last.id}` : `빌드 ${a.last.buildNo}`}`;
    return [
      { 칸: [머리], 결: '묶음' },
      ...결과.map((x) => {
        const 이름 = 종류이름[x.kind as keyof typeof 종류이름] ?? x.kind;
        const 특성 = x.quality === undefined ? '' : ` (${품질특성[x.quality as keyof typeof 품질특성] ?? x.quality})`;
        // 저장된 첫 장 재료 꼴 그대로라 결과 글 함수에 넘긴다
        return { 칸: [`${이름}${특성}`, 결과글(x as Parameters<typeof 결과글>[0])] };
      }),
    ];
  });
  return [
    { 꼴: '절', 글: '애플리케이션별 상태' },
    {
      꼴: '표',
      머리: ['애플리케이션', '빌드', '기간 판정 (기능 · UI)', '회귀 실패', '열린 결함', '리포트'],
      줄: b.apps.map((a) => ({
        칸: [
          a.name,
          a.builds.length === 0 ? '—' : a.builds.length === 1 ? a.builds[0]! : `${a.builds[0]!} ~ ${a.builds.at(-1)!}`,
          판정글(a.runs),
          String(a.newFailures),
          a.openDefects === null ? '—' : String(a.openDefects),
          a.reports === 0 ? '없음' : `${a.reports}건${a.unapproved > 0 ? ` (승인 전 ${a.unapproved})` : ''}`,
        ],
      })),
    },
    { 꼴: '소절', 글: '기간 안 마지막 애플리케이션 리포트의 결과 요약' },
    { 꼴: '표', 머리: ['종류', '결과'], 줄: 요약줄 },
  ];
}

function 이번기간(b: 몸): 덩이[] {
  const 커버 = b.coverage.map((c) => {
    const 끝 = c.points.at(-1) ?? c.start;
    const 글 = (p: { cased: number; total: number } | null | undefined) => (p == null ? '—' : 비율(p.cased, p.total));
    return `${c.name} ${글(c.start)} → ${글(끝)}${c.points.length === 0 ? ' (기간 안 작성 없음)' : ''}`;
  });
  return [
    { 꼴: '절', 글: '이번 기간' },
    {
      꼴: '표',
      머리: [],
      줄: [
        { 칸: ['기능 · UI 판정', `${판정글(b.passRate.current)}\n바로 앞 같은 길이 기간: ${판정글(b.passRate.previous)}`] },
        { 칸: ['배포', b.deploys === null ? 'Issue Bunker 미연결' : `${b.deploys.count}회${b.deploys.rollbacks > 0 ? ` (롤백 ${b.deploys.rollbacks})` : ''}`] },
        { 칸: ['변경 확인', b.changes === null ? 'Issue Bunker 미연결' : b.changes.issues === 0 ? '배포에 든 변경 없음' : `${b.changes.confirmed} / ${b.changes.issues}건 확인`] },
        { 칸: ['요구사항 커버리지', 커버.length === 0 ? '기록 없음' : 커버.join('\n')] },
      ],
    },
  ];
}

function 결함추이(b: 몸): 덩이[] {
  const 절: 덩이 = { 꼴: '절', 글: '결함 추이' };
  if (b.defects === null) return [절, { 꼴: '글', 글: 'Issue Bunker 미연결', 결: '흐림' }];
  const d = b.defects;
  return [
    절,
    { 꼴: '글', 글: `신규 ${d.opened} · 해결 ${d.closed} · 열린 결함 ${d.days[0]?.open ?? 0} → ${d.days.at(-1)?.open ?? 0}` },
    { 꼴: '글', 글: `날마다 그날 끝에 열린 결함: ${바뀐날글(d.days.map((x) => ({ day: x.day, 값: x.open })))}`, 결: '흐림' },
  ];
}

function 비기능품질(b: 몸): 덩이[] {
  const 성능종류 = { LOAD: '부하', PAGE: '페이지', DEVICE: '기기' } as const;
  return [
    { 꼴: '절', 글: '비기능 품질' },
    ...b.nonFunctional.flatMap((a): 덩이[] => {
      const 머리: 덩이 = { 꼴: '소절', 글: a.name };
      if (a.perf.length === 0 && a.stab === null) return [머리, { 꼴: '글', 글: '기간 안 기록 없음', 결: '흐림' }];
      const 성능: 덩이[] =
        a.perf.length === 0
          ? [{ 꼴: '글', 글: '성능 효율성 — 기간 안 기록 없음', 결: '흐림' }]
          : [
              { 꼴: '글', 글: '성능 효율성 · 성능 목표 달성 추이', 결: '머리' },
              {
                꼴: '표',
                머리: ['날짜', '실행', '종류', '통과', '미달'],
                줄: a.perf.map((p) => ({ 칸: [짧은날(p.day), `PRF-${String(p.runId).padStart(4, '0')}`, 성능종류[p.kind], String(p.pass), String(p.fail)] })),
              },
            ];
      const s = a.stab;
      const 안정화: 덩이[] =
        s === null
          ? [{ 꼴: '글', 글: a.kind === 'API' ? '신뢰성 — API 애플리케이션은 안정화 집계가 없습니다' : '신뢰성 — 기간 안 기록 없음', 결: '흐림' }]
          : [
              { 꼴: '글', 글: '신뢰성 · 안정화 (판정은 통과했지만 오류가 난 케이스)', 결: '머리' },
              {
                꼴: '표',
                머리: ['날짜', '오류 발생 케이스', '비율', '크래시', '잔여 오류'],
                줄: s.days.map((x) => ({
                  칸: [짧은날(x.day), `${x.passErrorCases} / ${x.cases}`, 비율(x.passErrorCases, x.cases), x.crashes === null ? '—' : String(x.crashes), String(x.residual)],
                })),
              },
              { 꼴: '글', 글: `기간 안 신규 ${s.newErrors} · 재발 ${s.reopened} · 해결 확인 ${s.confirmed} — 날마다의 오류 종류는 안정화 지표 화면에서 봅니다`, 결: '흐림' },
            ];
      return [머리, ...성능, ...안정화];
    }),
  ];
}

function 막힌것(b: 몸): 덩이[] {
  const 절: 덩이 = { 꼴: '절', 글: '진행을 막은 것' };
  if (b.blocked.length === 0) return [절, { 꼴: '글', 글: '기간 안 멈춘 실행 · 준비 실패 · 성능 실행 오류 없음', 결: '흐림' }];
  return [
    절,
    {
      꼴: '표',
      머리: ['애플리케이션', '멈춘 실행', '준비 실패', '성능 실행 오류'],
      줄: b.blocked.map((x) => ({ 칸: [x.name, `${x.aborted}회`, `${x.prepFailed}회`, `${x.perfErrors}회`] })),
    },
  ];
}

function 다음예정(b: 몸): 덩이[] {
  const u = b.upcoming;
  return [
    { 꼴: '절', 글: '다음 기간 예정' },
    { 꼴: '글', 글: `${u.from} ~ ${u.to}`, 결: '흐림' },
    u.sets.length === 0
      ? { 꼴: '글', 글: '이 기간에 도는 정기 실행 세트 없음', 결: '흐림' }
      : { 꼴: '표', 머리: ['정기 실행 세트', '반복', '회차'], 줄: u.sets.map((s) => ({ 칸: [s.name, `${반복글(s)} (${s.tz})`, `${s.runs}회`] })) },
  ];
}

function 부록(b: 몸): 덩이[] {
  const 절: 덩이 = { 꼴: '절', 글: '부록 · 이 기간의 애플리케이션 리포트' };
  if (b.appendix.length === 0) return [절, { 꼴: '글', 글: '기간 안 애플리케이션 리포트 없음', 결: '흐림' }];
  return [
    절,
    {
      꼴: '표',
      머리: ['애플리케이션', '리포트', '버전', '상태'],
      줄: b.appendix.flatMap((a) =>
        a.reports.map((r) => ({
          칸: [a.name, r.buildNo !== null ? `빌드 ${r.buildNo}` : r.runId !== null ? `RUN ${r.runId}` : `PRF-${String(r.perfRunId ?? 0).padStart(4, '0')}`, `버전 ${r.version}`, r.approved ? '승인됨' : '승인 전'],
          // 화면 안 리포트 보기 주소 — 같은 출처라 HTML 에서 바로 열린다
          고리: [null, `/#/qa-reports/${String(r.id)}`, null, null],
        })),
      ),
    },
  ];
}

export function 프로젝트리포트글(r: 프로젝트리포트응답): 덩이[] {
  let 번호 = 0;
  return [
    ...개요(r),
    ...앱상태(r.body),
    ...이번기간(r.body),
    ...결함추이(r.body),
    ...비기능품질(r.body),
    ...막힌것(r.body),
    ...남은리스크(r, '지난 리포트 대비 리스크'),
    ...다음예정(r.body),
    ...부록(r.body),
  ].map((d) => (d.꼴 === '절' ? { ...d, 글: `${++번호}. ${d.글}` } : d));
}

export function renderProjectReportHtml(r: 프로젝트리포트응답): string {
  const 제목 = 프로젝트리포트제목(r);
  return 문서판(제목, [
    리포트스타일,
    `<header class="cover">`,
    `  <div><div class="kicker">프로젝트 QA 리포트</div><h1>${안전(제목)}</h1><div class="when">${안전(시각(r.createdAt))} 기준 집계</div></div>`,
    `</header>`,
    ...첫장(프로젝트리포트글(r)),
  ]);
}

export function renderProjectReportDocx(r: 프로젝트리포트응답): Promise<Buffer> {
  return 워드파일(
    [
      문단(프로젝트리포트제목(r), { 꼴: 'Title' }),
      문단(`${시각(r.createdAt)} 기준 집계`, { 꾸밈: `<w:color w:val="${흐린글색}"/>` }),
      ...프로젝트리포트글(r).map(워드덩이),
    ].join(''),
  );
}
