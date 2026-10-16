// E2E 시나리오 증적 — 케이스 증적과 같은 판에 단계 층이 하나 더 있다 (도메인/리포팅 §8.4 「E2E 시나리오 증적」)
// 가공하지 않는다 — 글자 · 가리기는 collectScenario.ts 가 끝냈다. 문서에 실리는 글은 하나도 빠짐없이 안전() 을 거친다(routes.ts 의 inline HTML 근거)

import type { E2E단계, E2E증적 } from './collectScenario.js';
import { 머리말, 문서판 } from './html.js';
import { 디바이스, 본문, 안전, 판정 } from './htmlItem.js';

export interface RenderOptions {
  /** 렌더 입력으로 받는다 — 함수 안에서 new Date() 를 부르면 재현성이 깨진다 (SPEC §3.3) */
  generatedAt: string;
}

const 칩 = (글: string) => `<span class="badge">${안전(글)}</span>`;

function 줄(라벨: string, 글들: string[]): string[] {
  if (글들.length === 0) return [];
  return [
    `  <div class="row">`,
    `    <div class="row-k">${라벨}</div>`,
    `    <div class="row-v">`,
    ...글들.map((글) => `      <div class="pre">${글}</div>`),
    `    </div>`,
    `  </div>`,
  ];
}

// 결과 화면의 단계 줄 끝과 같다 — 모킹 켜기 · 끄기는 「적용됨」, 안 돈 단계는 판정 대신 한 줄 (도메인/시나리오 §8.11)
function 끝(d: E2E단계): string {
  if (d.적용됨) return 칩('적용됨');
  if (d.안돌았다) return `<span class="devs">– 실행 안 됨</span>`;
  return `${판정(d.status)}${d.durationMs === null ? '' : `<span class="ms">(${d.durationMs}ms)</span>`}`;
}

function 단계(d: E2E단계): string[] {
  const 이름 =
    d.item === null
      ? `<span class="tc-name">${안전(d.요약)}</span>`
      : `<span class="tc-id">${안전(d.item.tcId)}</span><span class="tc-name">${안전(d.item.tcName)}</span>`;
  const 미확정사유 = d.item?.unconfirmed ?? null;
  const 칩들 = [
    미확정사유 === null ? '' : 칩('미확정'),
    // 안 적으면 가짜 응답으로 통과한 것이 진짜로 읽힌다 — 검수 서류로서 치명적이다 (도메인/리포팅 §8.4)
    d.모킹구간.length === 0 ? '' : 칩('모킹 구간'),
    d.모킹안탐 ? 칩('모킹되지 않음') : '',
    d.단독실행 ? 칩('단독 실행') : '',
  ].join('');
  const 사유 = d.사유;

  return [
    `<section class="${d.모킹구간.length === 0 ? 'stage' : 'stage mocked'}">`,
    `  <h3 class="card-head">${칩(`${d.seq}단계`)}${칩(d.종류)}${이름}${칩들}${끝(d)}</h3>`,
    ...(d.모킹구간.length === 0
      ? []
      : [
          `  <div class="note">${
            d.모킹안탐 ? '이 단계의 API 호출은 모킹되지 않습니다' : `모킹이 적용된 상태로 실행했습니다 — ${안전(d.모킹구간.join(', '))}`
          }</div>`,
        ]),
    ...(미확정사유 === null ? [] : [`  <div class="u-reason">미확정 · ${안전(미확정사유)}</div>`]),
    ...줄('건너뜀', d.건너뜀.map(안전)),
    ...줄(
      '값 연결',
      d.값연결.map((v) => `${칩(v.종류)} ${안전(v.글)}`),
    ),
    ...줄(d.status === 'FAIL' ? '실패 사유' : '실행이 멈춘 사유', 사유 === null ? [] : [안전(사유)]),
    // 안 돈 단계는 절차를 그리지 않는다 (도메인/리포팅 §8.4)
    ...(d.item === null || d.안돌았다 ? [] : 본문(d.item)),
    `</section>`,
  ];
}

export function renderScenarioHtml(doc: E2E증적, options: RenderOptions): string {
  const 미확정 = doc.unconfirmed ? 칩('미확정') : '';
  return 문서판(`${doc.header.serviceName} E2E 증적 — RUN ${doc.runId}`, [
    ...머리말(doc.header, options.generatedAt),
    `<section class="band"><div class="card-head"><span class="tc-id">SC-${doc.scenarioId}</span><span class="tc-name">${안전(doc.header.title)}</span>${칩(`v${doc.version}`)}${칩(디바이스[doc.platform])}${doc.verdict === null ? '' : 판정(doc.verdict)}${미확정}</div></section>`,
    `<h2 class="sec">단계별 결과</h2>`,
    ...doc.parts.flatMap(단계),
    // 판정에는 안 든다 — 마지막 단계 뒤에 한 줄씩 (도메인/시나리오 §3.7 결정 12)
    ...(doc.정리.length === 0 ? [] : [`<section class="stage">`, ...doc.정리.map((글) => `  <div class="pre">${안전(글)}</div>`), `</section>`]),
  ]);
}
