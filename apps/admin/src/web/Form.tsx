// 스키마에서 뽑은 칸을 화면 컨트롤로 그린다 (DESIGN.md 폼 자동 생성 규칙)
// 값은 전부 글자로 들고 있다가 보낼 때 schema.ts의 toValues가 명세 타입으로 되돌린다

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

export function Form({ idPrefix, fields, text, errors, onChange }: Props) {
  if (fields.length === 0) {
    return <p className="hint">이 케이스는 입력값을 선언하지 않았습니다.</p>;
  }

  return (
    <>
      {fields.map((field) => {
        const id = `${idPrefix}-${field.key}`;
        const value = text[field.key] ?? '';
        const error = errors[field.key];

        return (
          <div className="field" key={field.key}>
            <label htmlFor={id}>
              {field.label} {field.optional ? <span className="opt">선택</span> : null}
            </label>
            <div>
              {field.kind === 'enum' ? (
                <select id={id} value={value} onChange={(e) => onChange(field.key, e.target.value)}>
                  {field.optional ? <option value="">고르지 않음</option> : null}
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
                  <option value="true">{YES}</option>
                  <option value="false">{NO}</option>
                </select>
              ) : (
                <input
                  // 어깨너머로 보는 것을 막는다. 값은 가리지 않고 그대로 서버로 간다 (SPEC §8.2)
                  type={field.secret ? 'password' : 'text'}
                  id={id}
                  className={field.kind === 'number' ? 'narrow' : undefined}
                  value={value}
                  onChange={(e) => onChange(field.key, e.target.value)}
                />
              )}
            </div>
            {/* 사유는 칸 아래 한 줄. 버튼은 비활성화하지 않는다 (SPEC §8.2) */}
            {error === undefined ? null : <div className="err">{error}</div>}
          </div>
        );
      })}
    </>
  );
}
