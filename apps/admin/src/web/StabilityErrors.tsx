// 안정화 지표 「오류 목록」 판 — PC 는 표, 휴대폰은 카드 줄 (도메인/안정화 §8.19 · 시안 6판 A6 · A6m)

import { use말 } from './i18n.js';
import { use휴대폰 } from './phone.js';
import type { 오류상태, 오류줄 } from './stabilityApi.js';
import { 날글자, 최초발생글, 케이스글 } from './stabilityView.js';

type 말 = ReturnType<typeof use말>;

/** 상세는 그 실행으로 연다 — 다른 날을 골라 놓고 누르면 그날 상태가 보여야 한다 (§7 GET /api/stability/errors/:id?run=) */
const 상세주소 = (id: number, runId: number) => `#/stability/errors/${String(id)}?run=${String(runId)}`;

function 케이스칸({ tcIds, t }: { tcIds: string[]; t: 말 }) {
  const [앞글, 남은] = 케이스글(tcIds);
  return <>{남은 === 0 ? 앞글 : t('{번호} 외 {수}건', { 번호: 앞글, 수: 남은 })}</>;
}

/** 상태 칩. 색은 stability.css 가 토큰으로 잇는다 — 신규 대표색 · 증가 실패색 · 재발 파랑 · 기존 회색 (§8.19 「오류 목록 판」 · DESIGN.md 원칙 1 예외) */
export function 상태칩({ 상태, t }: { 상태: 오류상태; t: 말 }) {
  const [글, 꼴] = {
    NEW: [t('신규'), 'new'],
    UP: [t('증가'), 'up'],
    REOPENED: [t('재발'), 're'],
    // 판정 비교의 「기존 실패」와 글자가 같아 영어 표에서는 꼬리로 가른다 (docs/WORDS.md 「안정화 지표 화면에서만 쓰는 말」)
    ONGOING: [t('기존§안정화'), 'old'],
  }[상태];
  return <span className={`stab-chip ${꼴}`}>{글}</span>;
}

const 칩 = ({ 줄, t }: { 줄: 오류줄; t: 말 }) => <상태칩 상태={줄.state} t={t} />;

export function 오류목록판({ 줄들, runId, day, 이전있나 }: { 줄들: 오류줄[]; runId: number; day: string; 이전있나: boolean }) {
  const t = use말();
  const 휴대폰 = use휴대폰();
  const 이전글 = (n: number) => (이전있나 ? t('{수}건', { 수: n }) : '—');
  return (
    <section className="stab-panel stab-list dash-rise" aria-labelledby="stab-errors">
      <div className="stab-top">
        <h2 id="stab-errors">{t('오류 목록')}</h2>
        <span className="stab-faint">{t('이전 실행 대비')}</span>
      </div>
      {줄들.length === 0 ? (
        <p className="stab-wait">{t('이 실행에는 오류가 없습니다')}</p>
      ) : 휴대폰 ? (
        <ul className="stab-cards">
          {줄들.map((줄) => (
            <li key={줄.id}>
              <a href={상세주소(줄.id, runId)}>
                <span className="stab-card-top">
                  <칩 줄={줄} t={t} />
                  <span className="stab-faint">
                    {이전있나 ? t('{수}건 · 이전 {이전}건', { 수: 줄.cases, 이전: 줄.previousCases }) : t('{수}건', { 수: 줄.cases })}
                  </span>
                </span>
                <span className="mono">{줄.title}</span>
                <span className="stab-faint">
                  {t('최초 발생 {날}', { 날: 최초발생글(줄.firstDay, 줄.firstBuildNo) })} · <케이스칸 tcIds={줄.tcIds} t={t} />
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <div className="stab-scroll">
          <table className="stab-table">
            <thead>
              <tr>
                <th scope="col">{t('오류')}</th>
                <th scope="col">{t('상태')}</th>
                <th scope="col" className="num">
                  {날글자(day)}
                </th>
                <th scope="col" className="num">
                  {t('이전 실행')}
                </th>
                <th scope="col">{t('최초 발생')}</th>
                <th scope="col">{t('발생 케이스')}</th>
              </tr>
            </thead>
            <tbody>
              {줄들.map((줄) => (
                <tr key={줄.id}>
                  <td className="mono">
                    <a href={상세주소(줄.id, runId)}>{줄.title}</a>
                  </td>
                  <td>
                    <칩 줄={줄} t={t} />
                  </td>
                  <td className="num">{t('{수}건', { 수: 줄.cases })}</td>
                  <td className="num">{이전글(줄.previousCases)}</td>
                  <td>{최초발생글(줄.firstDay, 줄.firstBuildNo)}</td>
                  <td className="stab-faint">
                    <케이스칸 tcIds={줄.tcIds} t={t} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
