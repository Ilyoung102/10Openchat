# MAZI Service (10Openchat)

MAZI Service는 미래지향적인 디자인과 강력한 AI 기능을 결합한 개인용 AI 어시스턴트 플랫폼입니다. OpenAI의 최신 모델을 활용하며, 웹 검색, 음성 합성(TTS), 음성 인식(STT) 등의 기능을 제공합니다.

## 주요 기능

- **실시간 웹 검색**: Tavily API를 연동하여 최신 뉴스, 날씨, 정보 등을 실시간으로 검색하여 답변합니다.
- **음성 합성 (TTS)**: AI의 답변을 자연스러운 음성으로 들려줍니다. (OpenAI TTS-1 모델 사용)
- **음성 인식 (STT)**: 마이크를 통해 사용자의 음성을 인식하여 텍스트로 변환합니다. (OpenAI Whisper 모델 사용)
- **대화 모드**: 음성 대화 환경에 최적화된 간결하고 자연스러운 대화 환경을 제공합니다.
- **BYOK (Bring Your Own Key)**: 별도의 서버 설정 없이 화면에서 직접 자신의 OpenAI API 키를 입력하여 사용할 수 있습니다.
- **Windows 최적화**: Windows 환경에서도 안정적으로 작동하도록 포트 바인딩 및 환경 변수 처리가 최적화되어 있습니다.

## 시작하기

### 1. 의존성 설치
```bash
npm install
```

### 2. 빌드 및 실행
```bash
# 프로덕션 빌드
npm run build

# 개발 모드 실행 (Vite + Express)
npm run dev
```

### 3. API 키 설정
- 브라우저로 접속(`http://localhost:5000`) 후, 좌측 하단의 설정(아이콘) 버튼을 클릭합니다.
- **API KEY** 항목에 자신의 OpenAI API 키를 입력합니다.
- (선택 사항) 서버의 `.env` 파일에 `OPENAI_API_KEY`와 `TAVILY_API_KEY`를 설정하여 전역적으로 사용할 수도 있습니다.

## 기술 스택

- **Frontend**: React, Vite, Tailwind CSS, Framer Motion, Lucide React
- **Backend**: Express, TypeScript, OpenAI Node SDK
- **Dev Tools**: tsx, esbuild, cross-env

## 주의 사항 (Windows)

- 본 프로젝트는 Windows 환경에서 `cross-env`를 통해 환경 변수를 처리하며, `reusePort` 옵션을 비활성화하여 소켓 충돌 문제를 해결했습니다.

## 라이선스

MIT License