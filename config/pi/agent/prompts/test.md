---
description: Write or improve tests for React and TypeScript code
argument-hint: '[file-or-scope]'
---

# 테스트 작성

현재 변경 사항 또는 지정한 파일/컴포넌트에 대한 테스트를 작성하거나 보강해줘.

## 사용자/프로젝트 맥락

- 나는 프론트엔드 개발자야.
- 주로 React와 TypeScript를 사용해.
- 테스트는 장기 유지보수성과 리뷰 가능성을 고려해 작성해줘.

## 기본 원칙

- 기존 프로젝트의 테스트 도구와 컨벤션을 먼저 확인해줘.
  - 예: Vitest, Jest, React Testing Library, Playwright, Cypress 등
- 테스트 도구나 새로운 라이브러리를 임의로 추가하지 말고, 필요하면 먼저 제안해줘.
- 구현 세부사항보다 사용자 관점의 동작을 우선 검증해줘.
- TypeScript 타입 안정성을 해치지 않도록 작성해줘.
- flaky test가 되기 쉬운 timer, async, network, animation 처리는 명확하게 제어해줘.
- UI 컴포넌트 테스트에서는 접근 가능한 role/name 기반 쿼리를 우선 사용해줘.
- 비즈니스 로직은 가능하면 UI와 분리된 단위 테스트로 검증해줘.

## 진행 방식

1. 변경 범위와 관련 테스트 환경을 파악해줘.
   - `package.json`
   - 테스트 설정 파일
   - 기존 테스트 파일
   - 테스트 대상 컴포넌트/훅/유틸

2. 테스트해야 할 주요 시나리오를 먼저 정리해줘.
   - 정상 동작
   - 에러/빈 값/null/undefined 등 경계값
   - 사용자 인터랙션
   - 비동기 로딩/실패 상태
   - 접근성에 영향을 주는 상태

3. 기존 컨벤션에 맞춰 테스트를 추가하거나 수정해줘.

4. 가능하면 관련 테스트를 실행하고 결과를 알려줘.
   - 전체 테스트가 오래 걸리면 변경 파일과 직접 관련된 테스트만 우선 실행해줘.
   - 실행하지 못한 경우 이유와 사용자가 실행할 명령어를 알려줘.

## React Testing Library 선호 방식

- `getByRole`, `findByRole`, `queryByRole`을 우선 사용해줘.
- 불가피한 경우에만 `getByText`, `getByTestId`를 사용해줘.
- `act`를 직접 쓰기보다 `userEvent`, `findBy*`, `waitFor` 등 권장 패턴을 우선 사용해줘.
- 스냅샷 테스트는 목적이 명확한 경우에만 사용해줘.

## 출력 형식

작업 후 아래 순서로 짧게 정리해줘.

1. 추가/수정한 테스트
2. 검증한 시나리오
3. 실행한 테스트 명령과 결과
4. 남은 리스크 또는 후속 제안
