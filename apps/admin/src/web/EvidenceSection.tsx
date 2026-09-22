// 실행 결과 화면의 증적 칸 (SPEC §8.4). 만들기 버튼과 안내·사유·만든 문서 목록을 한 자리에 모은다
//
// **조각이 둘인 이유** — 버튼은 RUN 머리 띠(`.tally`) 안에 있어야 하고(§8.4 가 자리를 못 박았다)
// 안내·사유·목록은 그 아래 본문이다. 부모가 달라 한 덩어리로 못 그린다.
// 그래서 상태와 판단은 `use증적()` 하나에 모으고 그리는 조각만 둘로 나눈다.

import { api, type EvidenceRow, type RunSummary } from './api.js';
import { use말, use언어 } from './i18n.js';
import { 받는법, 증적버튼들, type 증적버튼모양 } from './evidence.js';
import type { 등급 } from './role.js';
import { message, when } from './ui.js';
import { useState } from 'react';

/** `api.run()` 이 주는 모양 중 이 칸이 쓰는 부분만 */
type 실행상세 = Pick<RunSummary, 'runId' | 'status'> & { evidence: EvidenceRow[] };

interface 사유줄 {
  format: string;
  라벨: string;
  사유: string;
}

export interface 증적칸 {
  버튼들: 증적버튼모양[];
  안내: string | null;
  사유줄들: 사유줄[];
  만든것: EvidenceRow[];
  만드는중: string[];
  누르기: (버튼: 증적버튼모양) => void;
}

/**
 * 증적 칸의 상태와 판단을 한 자리에 모은다.
 *
 * **`만드는중` 과 `증적오류` 를 둘 다 형식별로 잡는다.** 값 하나로 두면 PDF 를 누르는 순간
 * 엑셀·HTML 까지 잠기고, 엑셀만 실패해도 화면이 어느 형식이 깨졌는지 말하지 못한다.
 */
export function use증적(data: 실행상세 | null, role: 등급, reload: () => void): 증적칸 {
  const 언어 = use언어();
  const [만드는중, set만드는중] = useState<string[]>([]);
  const [증적오류, set증적오류] = useState<Record<string, string>>({});

  // **이른 반환 위에서 불린다.** 화면이 아직 데이터를 못 받았을 때도 훅 차례가 같아야 한다 —
  // `Loading` 뒤에서 부르면 React 가 훅 규칙 위반으로 던지고 화면이 통째로 빈다
  const 문서들 = data?.evidence ?? [];
  const 증적 = data === null ? null : 증적버튼들(data.status, 문서들, role, 언어);

  // 실패는 형식마다 따로 적는다. 방금 부르다 깨진 것(`증적오류`)이 더 새 소식이라 먼저다.
  // **다만 그 형식이 그 뒤에 READY 로 닫혔으면 접는다** — 안 접으면 문서가 멀쩡히 아래 목록에
  // 쌓이는데 그 위에는 못 만들었다는 빨간 줄이 남는다. 한 번 더 눌러 409 를 받은 뒤가 그 자리다
  const 사유줄들 = (증적?.버튼들 ?? []).flatMap((버튼) => {
    // **`some` 이 아니라 마지막 행이다.** 옛 성공 행 하나로 보면
    // 「성공한 뒤 다시 만들다 실패」에서 그 사유가 사라진다 (evidence.ts 도 `at(-1)` 을 본다)
    const 마지막 = 문서들.filter((it) => it.format.toUpperCase() === 버튼.format).at(-1);
    const 사유 = (마지막?.status === 'READY' ? null : 증적오류[버튼.format]) ?? 버튼.사유;
    return 사유 === undefined || 사유 === null ? [] : [{ format: 버튼.format, 라벨: 버튼.라벨, 사유 }];
  });

  // 만든 것은 최근 것이 위로. 파일 이름에 (1)·(2)가 붙으면 어느 것이 최신인지 알 수 없다 (SPEC §8.4)
  const 만든것 = 문서들
    .filter((it) => it.status === 'READY')
    .slice()
    .reverse();

  function 누르기(버튼: 증적버튼모양): void {
    if (data === null) return;
    set만드는중((전) => [...전, 버튼.format]);
    // 다시 누르면 그 형식의 앞선 실패 줄만 지운다. 안 지우면 성공해도 빨간 줄이 남는다
    set증적오류(({ [버튼.format]: _앞선것, ...나머지 }) => 나머지);
    void api
      .makeEvidence(data.runId, 버튼.format)
      .then(() => reload())
      .catch((err: unknown) => set증적오류((전) => ({ ...전, [버튼.format]: message(err, 언어) })))
      .finally(() => set만드는중((전) => 전.filter((it) => it !== 버튼.format)));
  }

  return { 버튼들: 증적?.버튼들 ?? [], 안내: 증적?.안내 ?? null, 사유줄들, 만든것, 만드는중, 누르기 };
}

/**
 * RUN 머리 띠 안에 들어가는 만들기 버튼들.
 *
 * 셋을 한 덩어리로 묶어 좁은 화면에서 통째로 아랫줄에 내린다. 안 묶으면 `PDF 만들기` 만
 * 판정 숫자에 달라붙고 나머지 둘이 아랫줄로 떨어진다 — 어떤 휴대폰에서도 셋이 한 줄에 못 선다.
 * `.btn` 의 꽉 찬 잉크색을 셋이나 늘어놓으면 머리 띠가 검은 덩어리가 된다 — 색은 판정만 갖는다.
 */
export function 증적만들기버튼들({ 칸 }: { 칸: 증적칸 }) {
  const t = use말();
  return (
    <div className="makebtns">
      {칸.버튼들.map((버튼) => {
        const 이것만드는중 = 칸.만드는중.includes(버튼.format);
        return (
          <button
            className="btn ghost"
            key={버튼.format}
            disabled={!버튼.누를수있나 || 이것만드는중}
            onClick={() => {
              칸.누르기(버튼);
            }}
          >
            {이것만드는중 ? t('{라벨} 만드는 중', { 라벨: 버튼.라벨 }) : 버튼.글}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 머리 띠 아래의 안내·실패 사유·만든 문서 목록.
 *
 * **`한줄로` 면 머리 줄 안에서 한 줄로 그린다** (2026-09-22). 상자 안에서는 이 칸이 블록으로
 * 130px 을 먹어 케이스 목록에 32px 밖에 안 남았다 — 줄 하나(101px)도 안 들어갔다.
 * 머리에 이미 만들기 버튼이 있어 같은 말을 두 번 하던 자리이기도 하다.
 *
 * **넷을 다 옮긴다.** 문서 목록만 옮기면 `안내`(「만드는 중입니다」)와 실패 사유가 집을 잃는데,
 * 그 글자가 영영 굳는 사고가 2026-09-19 에 한 번 났다 (docs/LEARNINGS.md).
 */
export function 증적알림과목록({ 칸, 한줄로 = false }: { 칸: 증적칸; 한줄로?: boolean }) {
  const t = use말();
  const 언어 = use언어();

  if (한줄로) {
    const 있나 = 칸.안내 !== null || 칸.사유줄들.length > 0 || 칸.만든것.length > 0;
    if (!있나) return null;
    return (
      <div className="evi-line">
        {칸.안내 === null ? null : <span className="scan-text">{칸.안내}</span>}
        {칸.사유줄들.map((줄) => (
          <span className="scan-error" key={줄.format}>
            {줄.라벨} 증적을 만들지 못했습니다 — {줄.사유}
          </span>
        ))}
        {칸.만든것.map((it) => {
          const 법 = 받는법(it.format, 언어);
          return (
            <span className="scan-text" key={it.id}>
              {when(it.generatedAt, 언어)} 만듦 · {법.라벨}
              <a
                className="evi-open"
                href={api.evidenceUrl(it.id)}
                {...(법.새창 ? { target: '_blank', rel: 'noreferrer' } : {})}
              >
                {법.글}
              </a>
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {/* 못 누르는 이유는 말풍선이 아니라 화면 글자로 적는다. `title` 은 마우스를 올려야 뜨는데
          휴대폰에는 올릴 마우스가 없고 `disabled` 버튼은 키보드 탭에서도 빠진다 (docs/DESIGN.md) */}
      {칸.안내 === null ? null : (
        <div className="scan">
          <span className="scan-text">{칸.안내}</span>
        </div>
      )}
      {칸.사유줄들.length === 0 ? null : (
        <div className="scan">
          {칸.사유줄들.map((줄) => (
            <span className="scan-error" key={줄.format}>
              {줄.라벨} 증적을 만들지 못했습니다 — {줄.사유}
            </span>
          ))}
        </div>
      )}
      {칸.만든것.length === 0 ? null : (
        <div className="sec">
          <div className="sec-h">{t('증적 문서')}</div>
          {/* 받기 전에 볼 수 있어야 한다. 화면의 항목 상세는 항목 한 건이고
              증적은 실행 전체 한 부다 (SPEC §8.4) */}
          {칸.만든것.map((it) => {
            const 법 = 받는법(it.format, 언어);
            return (
              <div className="pre" key={it.id}>
                {/* 버튼이 `엑셀`인데 목록이 `XLSX`면 한 화면에 같은 물건이 두 이름이다.
                    받는 길은 `format` 원문 그대로 쓰고 보여주는 글자만 라벨이다 */}
                {when(it.generatedAt, 언어)} 만듦 · {법.라벨}
                <a
                  className="btn small"
                  style={{ marginLeft: '10px' }}
                  href={api.evidenceUrl(it.id)}
                  {...(법.새창 ? { target: '_blank', rel: 'noreferrer' } : {})}
                >
                  {법.글}
                </a>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
