# PLAN to next version (1.2.0)

## 0. 사전 확인

- [ ] 로컬에서 `copy-code-as-snippet` 레포 클론 및 의존성 설치
  - `npm install`

- [ ] VS Code Extension Host로 실행해 현재 동작 확인
  - `Copy Code as Snippet` 명령이
    - 선택 영역 / 전체파일
    - markdown / html / plain
    - `includeFilePath` on/off
      에서 어떻게 동작하는지 손으로 한 번씩 확인

---

## 1. 새 설정(Configurations) 정의

### 1-1. `package.json`에 설정 키 추가

`contributes.configuration.properties`에 아래 설정들을 추가한다.

1. **AI 친화 스니펫 모드 (옵션)**
   - 키 예시: `copy-code-as-snippet.aiMode.enabled`
   - 타입: `boolean`
   - 기본값: `false`
   - 설명:

     > “AI 어시스턴트에게 주기 좋은 형식(파일/언어/라인 범위 헤더 등)으로 스니펫을 생성합니다.”

2. **마크다운 fence 승급 전략 (옵션)**
   - 키 예시: `copy-code-as-snippet.markdown.fenceStrategy`
   - 타입: `string`
   - enum 예시: `["default", "autoUpgrade", "tilde"]`
   - 기본값: `"default"` (기존 동작 유지)
   - 설명:
     - `default`: 현재처럼 ``` + language(:path) 형태 유지
     - `autoUpgrade`: 내용 중 ``` 가 포함되면 바깥 fence 를 4개 이상으로 승급
     - `tilde`: ```대신`~~~` 를 사용

3. **대용량 파일 처리용 설정 (옵션)**
   - 키 예시:
     - `copy-code-as-snippet.largeFile.lineThreshold`
     - `copy-code-as-snippet.largeFile.promptEnabled`

   - `lineThreshold`
     - 타입: `number`
     - 기본값 예: `1000` (파일 1000라인 이상이면 “대용량”으로 간주)

   - `promptEnabled`
     - 타입: `boolean`
     - 기본값: `false`
     - 설명:

       > “라인 수가 threshold 를 넘는 경우, 전체 복사 vs head/tail 샘플 복사 중 선택하도록 사용자에게 묻습니다.”

> ✅ **Acceptance Criteria**
>
> - 새 설정들이 VS Code Settings UI에 표시되고
> - 기본값 상태에서는 기존 사용자가 전혀 동작 변화를 느끼지 않는다.

---

## 2. 마크다운 fence 승급 로직 구현

### 2-1. Markdown 스니펫 생성 코드 파악 및 훅 추가

- [ ] `src/extension.ts` 내에서 **Markdown 스니펫을 생성하는 함수**를 찾는다.
  - 현재는 `format === 'markdown'` 분기에서
    - `typescript:src/extension.ts …` 형태로 문자열을 만들고 있다.

- [ ] 이 부분에 `fenceStrategy` 설정을 읽어오는 로직 추가:
  - `const fenceStrategy = config.get<string>('markdown.fenceStrategy', 'default');`

### 2-2. fence strategy별 동작 정의

1. **default**
   - 기존과 동일:
     - 바깥 fence: ` ``` `
     - fence header: ` ```language(:path) `

2. **tilde**
   - 바깥 fence: `~~~`
   - fence header: `~~~language(:path)`
   - 닫는 fence도 `~~~` 사용

3. **autoUpgrade**
   - 기본은 기존과 동일한 ``` 사용
   - 단, **내용(content)에 ``` 문자열이 존재하는 경우**:
     - 바깥 fence를 4개 (` ```` `) 또는 그 이상으로 승급
     - 닫는 fence도 동일 길이 사용

   - 간단한 구현 예:
     - `const hasTripleBacktick = content.includes('```');`
     - `const fence = hasTripleBacktick ? '````' : '```';`

> ✅ **Acceptance Criteria**
>
> - content에 ```가 없는 경우: 기존과 사실상 동일한 결과
> - content에 ```가 포함된 경우: 마크다운 렌더링이 깨지지 않고, fence 길이만 늘어난다.
> - tilde 모드에서는 언제나 `~~~` fence를 사용한다.

---

## 3. AI 친화 스니펫 모드 구현 (`aiMode.enabled`)

### 3-1. 동작 정의

`aiMode.enabled == true` 이고, `format === 'markdown'` 인 경우:

1. 코드 블록 위에 **헤더 텍스트**를 붙인다. 예:

   ```text
   ### File: lib/data/enums/chat_status.dart
   ### Language: dart
   ### Range: lines 5–28 (selection)
   ```

2. 코드 펜스는 **언어만** 포함한다. (파일 경로는 헤더로 이동)

   ````markdown
   예제 다트 코드는 다음과 같습니다:

   ```dart
   // Optionally: 주석으로 파일/범위 정보 반복
   @JsonEnum(...)
   enum ChatStatus { ... }
   ```
   ````

3. 라인 범위 정보:
   - 선택 영역이 있을 경우: `lines X–Y (selection)`
   - 선택이 없고 전체 파일인 경우: `lines 1–N (full file)` 또는 `Range: full file`

### 3-2. 구현 단계

- [ ] `editor.selection` 정보를 사용해 0-based line index를 가져온다.
  - `startLine = selection.start.line + 1;`
  - `endLine = selection.end.line + 1;`

- [ ] 파일 전체 텍스트의 라인 수를 계산 (`document.lineCount`)
- [ ] `aiMode.enabled`가 false일 땐 **지금과 완전히 동일**한 문자열을 리턴하도록 분기 유지
- [ ] true일 때는:
  - `headerText` 문자열을 조립
  - `fence` 는 2번에서 구현한 fence strategy 적용 결과를 재사용
  - `includeFilePath` 설정이 true면 헤더에 `File: <path>` 포함, false면 생략

> ✅ **Acceptance Criteria**
>
> - `aiMode.enabled = false` → 1.1.x 와 동일한 Markdown 출력
> - `aiMode.enabled = true` → 헤더 + 언어만 있는 코드펜스 구조로 출력
> - VS Code에서 미리보기 시 마크다운이 정상 렌더링

---

## 4. 대용량 파일 처리: head/tail 샘플 복사 옵션

### 4-1. 대략 동작 설계

- 조건:
  - `largeFile.promptEnabled == true`
  - 현재 파일의 전체 라인 수 `> lineThreshold`

- 이 조건을 만족하면 `Copy Code as Snippet` 실행 시:
  1. `window.showQuickPick` 또는 `window.showInformationMessage`로 선택지를 띄운다.
     - 선택지 예:
       - `Copy full file`
       - `Copy head & tail (first 30 + last 30 lines)`
       - `Cancel`

  2. 사용자가:
     - `Copy full file` → 기존 전체 파일 복사 로직 호출
     - `Copy head & tail` → 아래 규칙으로 content 가공 후 스니펫 생성
     - `Cancel` → 명령 중단

### 4-2. head/tail content 생성 규칙

- 상수 예: `headLines = 30`, `tailLines = 30` (하드코딩 or 설정으로 뺄지 결정)
- 파일 총 라인 수를 N이라 할 때:
  - N <= headLines + tailLines → 그냥 전체 복사 (edge case 방어)
  - N > headLines + tailLines →
    - 1~headLines 줄
    - 중간에 구분자 라인 추가 (예: `// ... 9,940 more lines omitted` 또는 `# ... omitted`)
    - 마지막 `tailLines` 줄

- 언어별 주석문자까지 맞추려면 일이 커지니, 1차 버전은 단순 텍스트:
  - `... <N - headLines - tailLines> lines omitted ...`
  - 또는 `// ... omitted ...` (언어 가리지 않고 `//` 사용해도 LLM/사람 모두 이해 가능한 수준)

> ✅ **Acceptance Criteria**
>
> - 대용량 파일에서 `promptEnabled = false` → 기존 전체 복사 동작 그대로
> - `promptEnabled = true`, N > threshold → 사용자에게 선택지 뜸
> - `head/tail` 선택 시, 중간이 생략된 것임을 사람이/LLM이 모두 쉽게 이해 가능

---

## 5. HTML / plain 포맷과의 호환성 고려

- [ ] AI 모드 / large-file 로직이 `markdown` 이외 포맷에 어떤 영향을 줄지 확인
  - 간단한 규칙 제안:
    - `aiMode.enabled` 는 **우선 markdown 전용**으로만 적용
    - HTML/plain 은 그대로 두거나, 나중에 별도 모드로 확장

- [ ] `format !== 'markdown'` 인 경우:
  - fence 승급이나 헤더 추가 로직이 동작하지 않도록 방어

> ✅ **Acceptance Criteria**
>
> - HTML, plain 포맷 사용자는 새 설정을 켜도 **출력이 깨지지 않고** 기존과 유사한 형태 유지

---

## 6. 테스트 & 리그레션 체크

- [ ] 다양한 조합으로 수동 테스트
  - format: markdown / html / plain
  - includeFilePath: true / false
  - aiMode.enabled: true / false
  - fenceStrategy: default / autoUpgrade / tilde
  - largeFile.promptEnabled: true / false + 작은 파일 / 큰 파일
  - 선택 영역 / 전체 파일

- [ ] `.vscode-test.mjs` 기반으로 간단한 자동 테스트 가능하면 추가
  - 예: 내부 함수 리턴 문자열을 검사하는 유닛 테스트 (로직을 extension activation 과 분리된 pure 함수로 빼두면 용이)

> ✅ **Acceptance Criteria**
>
> - 기존 1.1.x 동작을 모든 조합에서 재현 가능 (설정 기본값 기준)
> - 새 설정을 켰을 때만 새로운 포맷/동작이 나타나는지 확인

---

## 7. 문서 & 버전 업데이트 (1.1.1 → 1.2.0)

1. **`package.json` 버전 변경**
   - `"version": "1.2.0"`

2. **`CHANGELOG.md` 업데이트**
   - `### 1.2.0` 섹션 추가
   - 주요 변경사항 요약:
     - AI 친화 스니펫 모드 옵션 추가
     - 마크다운 fence 승급 전략 옵션 추가
     - 대용량 파일에서 head/tail 샘플 복사 선택 기능 추가

3. **`README.md` 업데이트**
   - Extension Settings 표에 새 설정들 추가
   - 예시 섹션에:
     - aiMode 켰을 때의 snippet 예제
     - large-file head/tail 예제

> ✅ **Acceptance Criteria**
>
> - Marketplace / README 를 읽는 사용자에게 1.2.0 변경점이 명확히 전달된다.
> - 기존 유저는 “옵션을 켜야 새 동작이 나온다”는 점을 쉽게 이해할 수 있다.
