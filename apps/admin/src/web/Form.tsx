// 스키마에서 뽑은 칸을 화면 컨트롤로 그린다 (DESIGN.md 폼 자동 생성 규칙)
// 값은 전부 글자로 들고 있다가 보낼 때 schema.ts의 toValues가 명세 타입으로 되돌린다

import { use말 } from './i18n.js';
import type { Field } from './schema.js';

interface Props {
  /** 같은 이름의 칸이 입력값과 기대결과에 동시에 있을 수 있다. id가 겹치면 라벨이 엉뚱한 칸을 가리킨다 */
  idPrefix: string;
  fields: Field[];
  text: Record<string, string>;
  errors: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

// 스키마는 참·거짓만 알려 준다. 화면에는 코드 낱말 대신 사람이 읽는 두 낱말을 쓴다 (DESIGN.md)
const YES = '예';
const NO = '아니오';

/**
 * 칸 아래에 적을 기본값 글자. 없으면 `null` 이라 줄 자체를 안 그린다.
 *
 * **왜 늘 적나** — 값을 고칠 수는 있는데 「원래 값이 무엇이었나」를 볼 자리가 없었다.
 * 코드를 열어야 알 수 있으면 화면에서 값을 고치라고 해 놓고 판단할 근거를 안 준 것이다 (2026-09-21).
 */
function 기본값글자(field: Field, t: (키: string) => string): string | null {
  if (field.default === undefined || field.default === null) return null;
  // 비밀값은 기본값도 가린다. 화면·증적과 같은 기준이다 (SPEC §4.1)
  if (field.secret) return '********';
  if (typeof field.default === 'boolean') return t(field.default ? YES : NO);
  if (typeof field.default === 'object') return JSON.stringify(field.default);
  return String(field.default);
}

export function Form({ idPrefix, fields, text, errors, onChange }: Props) {
  const t = use말();

  if (fields.length === 0) {
    return <p className="hint">{t('이 케이스는 입력값을 선언하지 않았습니다.')}</p>;
  }

  return (
    <>
      {fields.map((field) => {
        const id = `${idPrefix}-${field.key}`;
        const value = text[field.key] ?? '';
        const error = errors[field.key];
        const 기본값 = 기본값글자(field, t);
        // 빈 칸은 「지웠다」이지 「기본값 그대로」가 아니다. 그것도 바뀐 것으로 센다
        const 바뀜 = 기본값 !== null && value !== 기본값;

        return (
          <div className="field" key={field.key}>
            <label htmlFor={id}>
              {field.label} {field.optional ? <span className="opt">{t('선택')}</span> : null}
            </label>
            <div>
              {field.kind === 'enum' ? (
                <select id={id} value={value} onChange={(e) => onChange(field.key, e.target.value)}>
                  {field.optional ? <option value="">{t('고르지 않음')}</option> : null}
                  {(field.options ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : field.kind === 'boolean' ? (
                <select
                  id={id}
                  className="narrow"
                  value={value}
                  onChange={(e) => onChange(field.key, e.target.value)}
                >
                  <option value="true">{t(YES)}</option>
                  <option value="false">{t(NO)}</option>
                </select>
              ) : (
                <input
                  // 어깨너머로 보는 것을 막는다. 값은 가리지 않고 그대로 서버로 간다 (SPEC §8.2)
                  type={field.secret ? 'password' : 'text'}
                  // 브라우저 비밀번호 관리자가 이 관리 화면의 로그인 비밀번호(Login.tsx 의
                  // current-password)를 후보로 내민다. 잘못 고르면 그 값이 테스트 입력값으로 서버에 가
                  // run_item.params 에 평문으로 남는데, 화면과 증적에는 ******** 로 가려져 들어간 줄도 모른다
                  autoComplete={field.secret ? 'new-password' : 'off'}
                  id={id}
                  className={field.kind === 'number' ? 'narrow' : undefined}
                  value={value}
                  onChange={(e) => onChange(field.key, e.target.value)}
                />
              )}
            </div>
            {/* 기본값은 늘 보인다. 바뀌었으면 그 사실까지 적는다 — 「이 값이 원래 값인가」가 한눈에 읽혀야 한다 */}
            {기본값 === null ? null : (
              <div className={바뀜 ? 'deflt changed' : 'deflt'}>
                {바뀜 ? <span className="mark" aria-hidden="true" /> : null}
                {t('기본값')} {바뀜 ? <s>{기본값}</s> : 기본값}
                {바뀜 ? ' ' + t('에서 바꿈') : ''}
              </div>
            )}
            {/* 사유는 칸 아래 한 줄. 버튼은 비활성화하지 않는다 (SPEC §8.2) */}
            {error === undefined ? null : <div className="err">{error}</div>}
          </div>
        );
      })}
    </>
  );
}
