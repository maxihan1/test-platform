// E2E 프로시저 단계의 결과 칸 — 프로시저 헤더(판정 점 · 건수)와 케이스 줄. 시나리오 결과 화면과 시험 실행 결과가 같이 쓴다 (도메인/시나리오 §3.7 결정 17 · DESIGN.md 「테스트 프로시저 · 목록 · 결과」)
// 실행 결과 화면(TP-F3-16)의 헤더 · 판정 표시 · Blocked 사유 부품을 그대로 쓴다 — 새 모양을 만들지 않는다

import { use언어 } from './i18n.js';
import { 판정표시, use막힘사유글 } from './proc.js';
import { 프로시저머리줄 } from './RunFlowTable.js';
import type { 줄판정 } from './runFlow.js';
import type { 프로시저칸 } from './scenarioApi.js';
import { 막은판정, 케이스판정 } from './scenarioProc.js';
import { seconds } from './ui.js';

export function 프로시저결과({ part, 실행중 = false }: { part: 프로시저칸; 실행중?: boolean }) {
  const 언어 = use언어();
  const 사유글 = use막힘사유글();
  if (part.procId === undefined) return null;
  const cases = part.cases ?? [];
  const 판정들: 줄판정[] = [];
  for (const c of cases) 판정들.push(케이스판정(c, 실행중));
  return (
    <div className="scn-pc-wrap">
      <프로시저머리줄 procId={part.procId} procName={part.procName ?? ''} 판정들={판정들} />
      <ol className="case-proc-list scn-pc">
        {cases.map((c, i) => {
          const v = 판정들[i]!;
          return (
            <li key={c.tcId}>
              <span className="n mono">{i + 1}</span>
              <span className="mono id">{c.tcId}</span>
              <span className="t">{c.name ?? ''}</span>
              {v.도는중 ? null : <판정표시 결과={{ status: v.status, blocked: v.blocked, blockedBy: c.blockedBy }} />}
              {c.durationMs === undefined ? null : <span className="dur">{seconds(c.durationMs, 언어)}</span>}
              {!v.blocked || c.blockedBy == null ? null : <small className="why">{사유글(c.blockedBy, 막은판정(cases, c.blockedBy))}</small>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
