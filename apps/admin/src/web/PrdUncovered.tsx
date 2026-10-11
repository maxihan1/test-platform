// 「PRD 관리」 할 일 칸 아래의 「PRD 에 없는 화면」 카드 — 찾은 화면 가운데 요구사항도 테스트도 없는 화면 (도메인/작성 §3.6 「사람이 고칠 때」)

import { use말 } from './i18n.js';
import type { PrdNow } from './prdApi.js';

export function PrdUncovered({ now }: { now: PrdNow }) {
  const t = use말();
  const 화면들 = now.uncoveredScreens;
  return (
    <section className="prd-card prd-uncovered" aria-labelledby="prd-uncovered-title">
      <header>
        <h2 id="prd-uncovered-title">{t('PRD 에 없는 화면 {건수}개', { 건수: 화면들.length })}</h2>
        <small>{t('찾은 화면 {전체}개 중 · 아직 요구사항도 테스트도 없는 화면입니다', { 전체: now.foundScreens })}</small>
      </header>
      {화면들.length === 0 ? (
        <p className="prd-card-empty">{t('PRD 에 없는 화면이 없습니다')}</p>
      ) : (
        <ul className="prd-screens">
          {화면들.map((x) => (
            <li key={`${x.state}\n${x.url}`}>
              <span className="case-tag">{x.state}</span>
              <span className="prd-id">{x.url}</span>
              <span className="prd-text">{x.name}</span>
            </li>
          ))}
        </ul>
      )}
      <footer>
        {now.screensOpen.length === 0 ? (
          <span className="note">{t('테스트 작성에서 기획서 없이 「실제 화면과 대조」로 보내면 이 화면만 작성합니다')}</span>
        ) : (
          now.screensOpen.map((번호) => (
            <span key={번호} className="note">
              {t('#{번호} 요청이 이 화면들을 작성하는 중입니다', { 번호 })}{' '}
              <a href={`#/authoring/${String(번호)}`}>{t('#{번호} 요청 보기', { 번호 })}</a>
            </span>
          ))
        )}
      </footer>
    </section>
  );
}
