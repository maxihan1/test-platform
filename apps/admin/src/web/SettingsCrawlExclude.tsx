// 설정 > 서비스 폼의 「훑지 않을 경로」 칸 — 실제 화면과 대조하는 작성(대조 · 화면만)이 크롤에서 뺄 경로를 한 줄에 하나씩 받는다 (도메인/인증 §8.8)

import { use말 } from './i18n.js';

/** 적은 글을 그대로 들고 있는다. 목록으로 바로 바꾸면 줄을 바꾸는 순간 빈 줄이 사라져 타이핑이 안 된다 */
export function CrawlExcludeField({ 값, 바꾼다 }: { 값: string; 바꾼다: (값: string) => void }) {
  const t = use말();
  return (
    <div className="field">
      <label htmlFor="sf-exclude">{t('훑지 않을 경로')}</label>
      <div>
        <textarea id="sf-exclude" rows={3} spellCheck={false} value={값} onChange={(e) => 바꾼다(e.target.value)} />
        <div className="hint">
          {t('한 줄에 하나씩, / 로 시작하게 적습니다. 실제 화면과 대조하는 작성은 이 경로와 그 아래 화면을 훑지 않습니다. 비워 두면 모든 화면을 훑습니다')}
        </div>
      </div>
    </div>
  );
}
