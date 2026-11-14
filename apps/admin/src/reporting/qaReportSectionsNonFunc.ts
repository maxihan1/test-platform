// QA 리포트 「비기능 검증」 구획의 글 — 호환성 = 디바이스 × 화면 격자 · 성능 = 성능 목표 표(성능 PDF 내용을 합침) · 안정화 = 오류 종류와 AI 실행 요약 (도메인/리포팅 §3.17 「종류별 구획」)
// 구획마다 머리에 품질 특성 이름(ISO/IEC 25010)과 결과 요약 같은 글 한 줄을 단다. 빈 값 문구는 qaReportText.ts 의 빈글

import { percentile } from '../perf/hist.js';
import { 값글 as 부하값글, 근거글, 실행번호글, 유형글, 지표글 as 부하지표글, 판정글 } from '../perf/pdf.js';
import type { 비기능재료, 성능목표, 성능재료, 호환성재료, 안정화재료 } from './qaReportNonFunc.js';
import type { 첫장 } from './qaReportSummary.js';
import { 격자칸, 결과글, 빈글, 시각, 종류이름, 출처이름, 품질특성, type 덩이, type 표줄 } from './qaReportText.js';

type 비기능줄 = 첫장['results']['nonFunctional'][number];

// 호환성 결과 화면의 의심 종류 이름(web/compatRunView.ts 의심글자)과 같은 글자 — 서버가 화면 모듈을 부르지 않게 옮겨 적었다. 모르는 종류는 받은 글자 그대로
const 의심이름: Record<string, string> = {
  overlap: '요소 겹침',
  'text-overflow': '텍스트 잘림',
  misaligned: '배치 틀어짐',
  'font-broken': '글꼴 표시 오류',
  'render-broken': '렌더링 오류',
  offscreen: '화면 밖',
};

function 디바이스글(d: 호환성재료['devices'][number]): string {
  const 접힘 = d.fold === 'OPEN' ? '펼침' : d.fold === 'FOLDED' ? '접힘' : null;
  return [`${d.seq}. ${d.model}`, d.os === null ? null : `Android ${d.os}`, 접힘].filter((x) => x !== null).join(' · ');
}

function 호환성세트(s: 호환성재료): 덩이[] {
  const 덩이들: 덩이[] = [{ 꼴: '소절', 글: `${s.setName} · RUN ${s.runId}` }];
  const 이름 = new Map(s.devices.map((d) => [d.seq, `${d.seq}. ${d.model}`]));
  if (s.rows.length === 0) 덩이들.push({ 꼴: '글', 글: 빈글.모든화면이상없음 });
  else {
    덩이들.push({
      꼴: '표',
      격자: true,
      머리: ['화면', ...s.devices.map(디바이스글)],
      줄: s.rows.map((r) => ({ 칸: [r.name, ...s.devices.map((d) => { const c = r.cells.find((x) => x.seq === d.seq); return c === undefined ? 빈글.기록없음 : 격자칸[c.value]; })] })),
    });
    덩이들.push({ 꼴: '글', 글: `칸 — 결함 의심: AI 가 찾고 사람이 아직 판정하지 않음 · 결함 · 결함 아님: 사람이 판정함 · 미점검: 점검하지 못함 · ${빈글.기록없음}: 그 디바이스가 지나지 않은 화면`, 결: '흐림' });
  }
  if (s.hiddenOk > 0) 덩이들.push({ 꼴: '글', 글: `이상 없는 화면 ${s.hiddenOk}개는 표에서 뺐습니다`, 결: '흐림' });
  if (s.cards.length > 0) {
    덩이들.push({ 꼴: '글', 글: 'UI 결함 의심', 결: '머리' });
    덩이들.push({
      꼴: '표',
      머리: ['화면', '디바이스', '케이스', '의심', '판정'],
      줄: s.cards.map((c) => ({
        칸: [c.screen, 이름.get(c.seq) ?? String(c.seq), c.tcId, c.issues.map((i) => `${의심이름[i.kind] ?? i.kind} — ${i.note}`).join('\n'), c.verdict === null ? '판정 전' : 격자칸[c.verdict]],
        ...(c.verdict === null ? { 결: '강조' as const } : {}),
      })),
    });
  }
  // 미점검 칸은 까닭이 같은 것끼리 디바이스마다 한 줄로 — 디바이스를 못 잡으면 화면마다 같은 까닭이 수십 줄 선다
  const 미점검 = new Map<string, { seq: number; 까닭: string; 수: number }>();
  for (const r of s.rows)
    for (const c of r.cells.filter((x) => x.value === 'UNCHECKED')) {
      const 열쇠 = `${c.seq}\u0000${c.reason ?? ''}`;
      미점검.set(열쇠, { seq: c.seq, 까닭: c.reason ?? '까닭 기록 없음', 수: (미점검.get(열쇠)?.수 ?? 0) + 1 });
    }
  if (미점검.size > 0) {
    덩이들.push({ 꼴: '글', 글: '미점검 까닭', 결: '머리' });
    덩이들.push({ 꼴: '표', 머리: ['디바이스', '까닭', '화면 수'], 줄: [...미점검.values()].map((m) => ({ 칸: [이름.get(m.seq) ?? String(m.seq), m.까닭, `${m.수}개`] })) });
  }
  return 덩이들;
}

// 서버 부하는 성능 PDF 와 같은 이름 · 값 글자, 페이지 · 기기 성능은 그 화면 이름(web/perfDeviceView.ts 지표표)과 같다
const 지표이름: Record<string, string> = { ...부하지표글, LCP: 'LCP', FCP: 'FCP', CLS: 'CLS', AVG_FPS: '평균 FPS', LOW1_FPS: '1% Low FPS', MAX_TEMP: '최대 디바이스 온도', MAX_MEM: '메모리 최대', LAUNCH_MS: '앱 실행 시간' };

function 목표값글(metric: string, v: number | null): string {
  if (v === null) return 빈글.기록없음;
  switch (metric) {
    case 'P95':
    case 'ERROR_RATE':
    case 'TPS':
      return 부하값글(metric, v);
    case 'LCP':
    case 'FCP':
      return `${Math.round(v).toLocaleString('en')}ms`;
    case 'CLS':
      return v.toFixed(2);
    case 'AVG_FPS':
    case 'LOW1_FPS':
      return `${v.toFixed(1)} FPS`;
    case 'MAX_TEMP':
      return `${v.toFixed(1)}도`;
    case 'MAX_MEM':
      return `${Math.round(v).toLocaleString('en')}MB`;
    case 'LAUNCH_MS':
      return `${(v / 1000).toFixed(1)}초`;
    default:
      return String(v);
  }
}

function 대상글(r: 성능재료, t: 성능목표): string {
  if (r.kind === 'DEVICE') return t.scope === undefined ? '전체' : `${r.devices.get(t.scope) ?? t.scope} (${t.scope})`;
  return t.scope === undefined || t.scope === '' ? '전체' : t.scope;
}

const 성능종류이름 = { LOAD: '서버 부하', PAGE: '페이지 성능', DEVICE: '기기 성능' } as const;

function 성능실행(r: 성능재료): 덩이[] {
  const 판정 = 판정글(r.verdict, r.status);
  const 덩이들: 덩이[] = [
    { 꼴: '소절', 글: `${실행번호글(r.id)} ${r.title === '' ? 성능종류이름[r.kind] : r.title}` },
    {
      꼴: '글',
      글: [r.kind === 'LOAD' ? (유형글[r.testType ?? ''] ?? '서버 부하') : 성능종류이름[r.kind], r.startedAt === null ? null : `시작 ${시각(r.startedAt)}`, `판정 ${판정}`]
        .filter((x) => x !== null)
        .join(' · ') + (r.testType === 'STRESS' && r.peakVus !== null ? `\n최대 동시 사용자 ${r.peakVus}명` : ''),
    },
  ];
  // 목표 판정은 「통과 · 미달」 — 결과 요약의 「성능 목표 통과 N · 미달 N」과 같은 말이다
  덩이들.push(
    r.targets.length === 0
      ? { 꼴: '글', 글: 빈글.성능목표없음 }
      : {
          꼴: '표',
          머리: ['지표', '대상', '목표', '잰 값', '판정', '근거'],
          판정칸: 4,
          줄: r.targets.map((t) => ({
            칸: [지표이름[t.metric] ?? t.metric, 대상글(r, t), `${t.op === '<=' ? '≤' : '≥'} ${목표값글(t.metric, t.value)}`, 목표값글(t.metric, t.measured), t.verdict === 'PASS' ? '통과' : '미달', `${근거글[t.source]}${t.reqId ? ` ${t.reqId}` : ''}`],
          })),
        },
  );
  덩이들.push({ 꼴: '글', 글: 'AI 분석', 결: '머리' });
  덩이들.push(r.ai === null ? { 꼴: '글', 글: 빈글.AI분석없음, 결: '흐림' } : { 꼴: '글', 글: [r.ai.title, ...r.ai.items.map((i) => `· ${i}`)].join('\n') });
  // 시간대별 추이 · 트랜잭션별은 서버 부하에만 있다 — 성능 PDF 가 싣던 차례 그대로
  if (r.kind === 'LOAD') {
    덩이들.push({ 꼴: '글', 글: '시간대별 추이', 결: '머리' }, { 꼴: '추이', rows: r.rows });
    if (r.txs.length > 0) {
      덩이들.push({ 꼴: '글', 글: '트랜잭션별 결과', 결: '머리' });
      덩이들.push({
        꼴: '표',
        머리: ['트랜잭션', '요청 수', '에러율', '95% 응답시간'],
        줄: r.txs.map((x) => ({ 칸: [x.tx, x.requests.toLocaleString('en'), 부하값글('ERROR_RATE', x.requests === 0 ? null : (x.errors / x.requests) * 100), 부하값글('P95', percentile(x.hist, 0.95))] })),
      });
    }
  }
  return 덩이들;
}

const 상태이름 = { NEW: '신규', UP: '증가', REOPENED: '재발', ONGOING: '기존' } as const;

function 안정화몸(a: 안정화재료): 덩이[] {
  const 덩이들: 덩이[] = [{ 꼴: '글', 글: '신규 · 증가 · 재발 오류 종류', 결: '머리' }];
  덩이들.push(
    a.errors.length === 0
      ? { 꼴: '글', 글: 빈글.오류종류없음 }
      : {
          꼴: '표',
          머리: ['구분', '오류 종류', '출처', '최초 발생', '발생 케이스', 'Issue Bunker'],
          줄: a.errors.map((e) => ({
            칸: [
              상태이름[e.state],
              e.title,
              출처이름[e.source as keyof typeof 출처이름] ?? e.source,
              `${e.firstDay}${e.firstBuildNo === null ? '' : ` · 빌드 ${e.firstBuildNo}`}`,
              `${e.cases}건`,
              e.issueKey ?? 빈글.기록없음,
            ],
          })),
        },
  );
  덩이들.push({ 꼴: '글', 글: 'AI 실행 요약', 결: '머리' });
  const s = a.summary;
  if (s === null) return [...덩이들, { 꼴: '글', 글: 빈글.AI요약없음, 결: '흐림' }];
  if (s.결과 === null) return [...덩이들, { 꼴: '글', 글: s.status === 'FAILED' ? 빈글.AI요약실패 : 빈글.AI요약작성중, 결: '흐림' }];
  // 안정화 화면의 요약 판(StabilitySummary.tsx)과 같은 칸 — 문단은 다시 쓰지 않고 그대로 싣는다 (§3.17 결정 18)
  const 줄 = (k: string, v: string): 표줄 => ({ 칸: [k, v] });
  return [
    ...덩이들,
    { 꼴: '글', 글: s.결과.headline },
    {
      꼴: '표',
      머리: [],
      줄: [
        줄('주요 변화', s.changes.length === 0 ? 빈글.변화없음 : s.changes.map((c) => `${상태이름[c.state as keyof typeof 상태이름] ?? c.state} — ${c.text}`).join('\n')),
        줄('기능별 오류 발생 케이스', s.features.length === 0 ? 빈글.기록없음 : s.features.map((f) => `${f.name} ${f.errorCases}건`).join('\n')),
        줄('해결 확인', s.결과.verified),
        줄('추세', s.결과.trend),
      ],
    },
  ];
}

/** 「비기능 검증」 구분 머리 → 호환성 · 성능 · 안정화. 돈 종류(호환성 · 성능)와 늘 서는 안정화만. 서는 구획이 없으면 빈 배열 */
export function 비기능구획(kinds: readonly string[], 줄들: 비기능줄[], 재료: 비기능재료): 덩이[] {
  const 선다 = 줄들.filter((x) => x.kind === 'STAB' || kinds.includes(x.kind));
  if (선다.length === 0) return [];
  return [
    { 꼴: '구분', 글: '비기능 검증' },
    ...선다.flatMap((x): 덩이[] => [
      { 꼴: '절', 글: `${x.kind === 'STAB' ? '안정화 · 오류 종류' : 종류이름[x.kind]} — 품질 특성 ${품질특성[x.quality]}` },
      { 꼴: '글', 글: 결과글(x) },
      ...(x.kind === 'COMPAT' ? 재료.호환성.flatMap(호환성세트) : x.kind === 'PERF' ? 재료.성능.flatMap(성능실행) : x.result === null || 재료.안정화 === null ? [] : 안정화몸(재료.안정화)),
    ]),
  ];
}
