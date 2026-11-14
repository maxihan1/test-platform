// QA 리포트를 워드(.docx)로 낸다 — 첫 장과 종류별 구획 머리는 HTML 과 같은 글 덩이, 케이스는 카드 대신 목록 표 (도메인/리포팅 §3.17 「내는 형식」)
// 실패 사진은 싣지 않는다 — 사진 증거는 PDF 가 기준 문서다 (QAR-F1-05 시작 질문 · 2026-11-14 사용자). 워드 파트는 표준 기획서 워드(prd/docx.ts)와 같은 판이다

import { 문단, 칸, 워드파일 } from '../prd/docx.js';
import type { 문서재료 } from './qaReportDoc.js';
import { 구획들, 단계목록, 케이스목록 } from './qaReportSections.js';
import { 격자칸, 리포트제목, 빈글, 승인뒤다시, 첫장글, 시각, type 덩이 } from './qaReportText.js';

// A4 에 여백 1인치면 글 폭이 9026 트윕이다 — 칸 수대로 나눈다. 두 칸 표(개요)는 이름 칸을 좁게 둔다
const 글폭 = 9026;
const 머리바탕 = 'F1EFEB';
const 묶음바탕 = 'F1EEE5';
// 강조는 판정이 아니라 「먼저 볼 것」이라 판정 빨강을 쓰지 않는다 (HTML 과 같은 노랑)
const 강조바탕 = 'FBF0D9';
const 흐린글색 = '5F5B55';
const 강조글색 = '7A5208';
// 판정한 결함만 판정 빨강 — HTML 증적 종이 색의 --fail 과 같다
const 실패글색 = '9B2418';

function 폭들(수: number): number[] {
  if (수 === 2) return [2000, 글폭 - 2000];
  const 하나 = Math.floor(글폭 / 수);
  return Array.from({ length: 수 }, (_, i) => (i === 수 - 1 ? 글폭 - 하나 * (수 - 1) : 하나));
}

function 표(d: Extract<덩이, { 꼴: '표' }>): string {
  const 수 = Math.max(d.머리.length, ...d.줄.map((z) => z.칸.length));
  const 폭 = 폭들(수);
  const 선 = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((자리) => `<w:${자리} w:val="single" w:sz="4" w:space="0" w:color="C9C5BF"/>`).join('');
  // 머리 줄은 쪽이 넘어가도 다시 찍는다(tblHeader)
  const 머리 =
    d.머리.length === 0 ? '' : `<w:tr><w:trPr><w:tblHeader/></w:trPr>${d.머리.map((m, i) => 칸(폭[i]!, 문단(m, { 꾸밈: '<w:b/>' }), 머리바탕)).join('')}</w:tr>`;
  const 줄 = d.줄
    .map((z) => {
      // 묶음 머리 줄은 한 칸이 표 폭 전부를 덮는다(gridSpan)
      if (z.결 === '묶음')
        return `<w:tr><w:tc><w:tcPr><w:tcW w:w="${글폭}" w:type="dxa"/><w:gridSpan w:val="${수}"/><w:shd w:val="clear" w:color="auto" w:fill="${묶음바탕}"/></w:tcPr>${문단(z.칸[0] ?? '', { 꾸밈: '<w:b/>' })}</w:tc></w:tr>`;
      const 바탕 = z.결 === '강조' ? 강조바탕 : undefined;
      // 호환성 격자 — 의심 칸은 노랑 바탕, 판정한 결함은 굵게 (HTML 과 같은 규칙)
      const 격자칸꼴 = (c: string, i: number) =>
        d.격자 === true && i > 0 && c === 격자칸.PENDING ? 칸(폭[i]!, 문단(c, { 꾸밈: `<w:b/><w:color w:val="${강조글색}"/>` }), 강조바탕)
        : d.격자 === true && i > 0 && c === 격자칸.CONFIRMED ? 칸(폭[i]!, 문단(c, { 꾸밈: `<w:b/><w:color w:val="${실패글색}"/>` }), 바탕)
        : 칸(폭[i]!, 문단(c), 바탕);
      return `<w:tr>${z.칸.map(격자칸꼴).join('')}</w:tr>`;
    })
    .join('');
  return (
    `<w:tbl><w:tblPr><w:tblW w:w="${글폭}" w:type="dxa"/><w:tblBorders>${선}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr>` +
    `<w:tblGrid>${폭.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${머리}${줄}</w:tbl>` +
    // 표 둘이 붙으면 워드가 하나로 합친다 — 사이에 빈 문단을 둔다
    문단('')
  );
}

function 덩이로(d: 덩이): string {
  switch (d.꼴) {
    case '절':
      return 문단(d.글, { 꼴: 'Heading1' });
    case '소절':
      return 문단(d.글, { 꼴: 'Heading2' });
    case '구분':
      // 띠는 제목 단계가 아니다 — 아래 호환성 · 성능 · 안정화가 기능 · UI · E2E 와 같은 Heading1 이라 띠까지 Heading1 이면 탐색 창에서 한 단으로 늘어선다
      return 문단(`━━ ${d.글} ━━`, { 꾸밈: `<w:b/><w:color w:val="${강조글색}"/>` });
    case '글':
      return 문단(d.글, { 꾸밈: d.결 === '흐림' ? `<w:color w:val="${흐린글색}"/>` : d.결 === '강조' ? `<w:b/><w:color w:val="${강조글색}"/>` : d.결 === '머리' ? '<w:b/>' : '' });
    case '추이':
      // 워드에는 그림을 싣지 않는다 — 사진 · 그림 증거는 PDF 가 기준 문서다 (§3.17 「내는 형식」)
      return 문단(빈글.추이워드, { 꾸밈: `<w:color w:val="${흐린글색}"/>` });
    case '표':
      return 표(d);
    case '흐름':
      return 문단(d.단계.map((s) => `${s.글} · ${s.판정}`).join(' → '));
  }
}

export function renderQaReportDocx(재료: 문서재료): Promise<Buffer> {
  const r = 재료.리포트;
  const 몸 = [
    문단(리포트제목(r), { 꼴: 'Title' }),
    문단(`버전 ${r.version} · ${r.approval === null ? '승인 전' : '승인됨'} · ${시각(r.updatedAt)} 기준`, { 꾸밈: `<w:color w:val="${흐린글색}"/>` }),
    ...(r.approval === null ? [] : [문단(승인뒤다시, { 꾸밈: `<w:color w:val="${흐린글색}"/>` })]),
    ...첫장글(r).map(덩이로),
    ...구획들(재료).flatMap((g) => [
      ...g.머리.map(덩이로),
      ...(g.케이스 === undefined ? [] : [덩이로({ 꼴: '소절', 글: '케이스' }), 덩이로(케이스목록(재료.항목.filter((i) => 재료.종류.get(i.tcId) === g.케이스)))]),
      ...(g.시나리오 ?? []).flatMap((s) => [...s.머리.map(덩이로), 덩이로(단계목록(s.doc))]),
    ]),
  ].join('');
  return 워드파일(몸);
}
