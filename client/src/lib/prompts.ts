
export interface ServiceItem {
  id: string;
  label: string;
  prompt: string;
}

export interface ServiceCategory {
  id: string;
  label: string;
  items: ServiceItem[];
}

// Common Instructions
const NO_TALK_INSTRUCTION = "\n(중요) 서론, 본론, 결론, 인사말 등 불필요한 대화체 멘트는 절대 하지 마세요. 오직 요청된 정보만 출력하세요.";

const ENGLISH_INSTRUCTION = NO_TALK_INSTRUCTION + "\n(출력 형식) 영어 회화와 한국어 해석, 단어 정보만 명확하게 표시하세요. 다른 설명은 생략합니다. 각 답변에는 상황에 맞는 텍스트 아이콘(이모지)을 사용하여 포인트를 주세요.";

const COOKING_INSTRUCTION = NO_TALK_INSTRUCTION + "\n(출력 형식) 요리 이름과 몇인분 기준인지(예: 2인분 기준)를 필히 명시하고, 상세 레시피를 깔끔하게 출력하세요. 제목과 주요 단계에 텍스트 아이콘(이모지)을 사용하여 시각적으로 꾸며주세요.";

const HEALTH_LIFE_INSTRUCTION = "\n(중요) 서론, 본론, 결론, 인사말 등 불필요한 대화체 멘트는 절대 하지 마세요. 오직 요청된 정보만 2가지 항목으로 출력하세요.\n(출력 형식) 숫자(1, 2) 대신 '▣' 또는 '◈' 기호를 사용하여 항목을 구분하세요. 블로그 작성처럼 텍스트 아이콘(이모지)을 적절히 활용하여 직관적이고 세련되게 작성하세요.";

const WEATHER_NEWS_INSTRUCTION = "\n(중요) 서론, 본론, 결론, 인사말 등 불필요한 대화체 멘트는 절대 하지 마세요. 오직 요청된 정보만 출력하세요. 답변은 항상 한글로 작성하세요.\n(출력 형식) 블로그 포스팅처럼 관련 텍스트 아이콘(이모지)을 적극적으로 사용하여 시각적으로 잘 정리된 형식으로 답변하세요.\n(날씨 규칙) '추정'이라는 표현은 삼가고, 현재 날씨는 기상청 등 신뢰할 수 있는 데이터를 기반으로 작성하세요.";

export const SERVICE_DATA: ServiceCategory[] = [
  {
    id: 'weather_news',
    label: '날씨 뉴스',
    items: [
      { id: 'curr_weather', label: '현재 날씨', prompt: '기본지역 군포 현재 날씨, 온도, 바람, 습도, 체감 온도, 강수율, 초미세먼지, 미세먼지, 오존(O3), 자외선 지수 정보를 보여주세요.' + WEATHER_NEWS_INSTRUCTION },
      { id: 'week_weather', label: '주간 날씨', prompt: '기본지역 군포 주간 날씨(오전, 오후), 최저온도, 최고온도, 습도, 강수율 정보를 보여주세요.' + WEATHER_NEWS_INSTRUCTION },
      { id: 'hour_weather', label: '시간별 날씨', prompt: '기본지역 군포 1시간별 3일간 날씨, 온도, 습도, 바람, 강수율 정보를 보여주세요.' + WEATHER_NEWS_INSTRUCTION },
      { id: 'nat_weather', label: '전국 날씨', prompt: '전국 단기 및 중기 날씨 관련 정보를 상세하게 보여주세요.' + WEATHER_NEWS_INSTRUCTION },
      { id: 'major_news', label: '주요 뉴스', prompt: "현재 한국의 주요 뉴스를 정치(3), 경제(3), 사회(1), 문화(1), 엔터(1), IT과학(1) 분류하여 ()비율에 맞게 상세하게 전달해 주세요. '비율에 맞추어' 또는 '몇 가지 뉴스' 같은 불필요한 설명 멘트는 생략하고 뉴스 내용만 브리핑 형식으로 출력하세요." + WEATHER_NEWS_INSTRUCTION },
      { id: 'world_news', label: '세계 뉴스', prompt: "현재 세계의 주요 뉴스를 세계 정치(3), 경제(3), AI/IT과학(2), 세계 이슈(2) 분류하여 ()비율에 맞게 상세하게 전달해 주세요. 정치 경제는 미국 관련과 빅테크 비중을 높게 잡아주세요. '비율에 맞추어' 등의 설명 멘트는 생략하고 내용만 출력하세요." + WEATHER_NEWS_INSTRUCTION },
    ]
  },
  {
    id: 'cooking',
    label: '요리 배우기',
    items: [
      { id: 'soup_kor', label: '한식 탕', prompt: '임의의 한식 탕관련 레시피 하나를 제공 해 주세요.' + COOKING_INSTRUCTION },
      { id: 'stew_kor', label: '한식 찌개', prompt: '임의의 한식 찌개관련 레시피 하나를 제공 해 주세요.' + COOKING_INSTRUCTION },
      { id: 'stir_kor', label: '한식 볶음', prompt: '임의의 한식 볶음관련 레시피 하나를 제공 해 주세요.' + COOKING_INSTRUCTION },
      { id: 'salad_kor', label: '한식 무침', prompt: '임의의 한식 무침관련 레시피 하나를 제공 해 주세요.' + COOKING_INSTRUCTION },
      { id: 'japan', label: '일식 요리', prompt: '임의의 일식 요리관련 레시피 하나를 제공 해 주세요.' + COOKING_INSTRUCTION },
      { id: 'chinese', label: '중식 요리', prompt: '임의의 중식 요리관련 레시피 하나를 제공 해 주세요.' + COOKING_INSTRUCTION },
      { id: 'french', label: '프랑스 요리', prompt: '임의의 프랑스 요리관련 레시피 하나를 제공 해 주세요.' + COOKING_INSTRUCTION },
      { id: 'italian', label: '이탈리아 요리', prompt: '임의의 이탈리아 요리관련 레시피 하나를 제공 해 주세요.' + COOKING_INSTRUCTION },
      { id: 'baguette', label: 'Baguette', prompt: '임의의 빵 관련 레시피 하나를 제공 해 주세요.' + COOKING_INSTRUCTION },
      { id: 'today', label: '오늘의 요리', prompt: '국적이 다 포함된 임의의 요리관련 레시피 하나를 제공 해 주세요.' + COOKING_INSTRUCTION },
      { id: 'healthy', label: '건강 요리', prompt: '임의의 건강하고 영양가 있는 요리관련 레시피 하나를 제공 해 주세요.' + COOKING_INSTRUCTION },
      { id: 'recommend', label: '추천 요리', prompt: '현재 할 수 있는 요리 하나를 레시피 제공 해 주세요.' + COOKING_INSTRUCTION },
    ]
  },
  {
    id: 'health',
    label: '건강 관리',
    items: [
      { id: 'habit', label: '건강 습관', prompt: '건강 습관 관련 정보를 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'diet_food', label: '건강 식단', prompt: '건강 식단 임의의 건강하고 영양가 있는 레시피 하나를 임의로 제공 해 주세요.' + COOKING_INSTRUCTION },
      { id: 'exercise', label: '건강 운동', prompt: '건강 운동 관련 정보를 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'diet', label: '다이어트', prompt: '다이어트 관련 정보를 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'obesity', label: '비만 관리', prompt: '비만 관리 관련 정보를 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'dental', label: '구강 치아', prompt: '구강과 치아 관련 정보를 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'skin', label: '피부 건강', prompt: '피부 건강 관련 정보를 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'joint', label: '관절 척추', prompt: '관절과 척추 관련 정보를 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'pain', label: '통증 관리', prompt: '통증 관리 관련 정보를 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'env', label: '환경 관리', prompt: '평상시 생활 속 환경 위생 관리 관련 정보를 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'mental', label: '멘탈 강화', prompt: '멘탈 강화 관련 정보를 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'immune', label: '면역 강화', prompt: '면역 강화 관련 정보를 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
    ]
  },
  {
    id: 'life',
    label: '생활 Tips',
    items: [
      { id: 'laundry', label: '세탁 의류', prompt: '세탁 의류 Tip을 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'kitchen', label: '주방 요리', prompt: '주방 요리 Tip을 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'cleaning', label: '청소 정리', prompt: '청소 정리 Tip을 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'home', label: '집안 관리', prompt: '집안 관리 Tip을 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'lifeitem', label: '생활용품', prompt: '생활용품 관리 Tip을 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'travel_go', label: '여행 나들이', prompt: '여행 나들이 Tip을 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'health_ex', label: '건강 운동', prompt: '건강 운동 Tip을 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'mental_care', label: '멘탈 관리', prompt: '멘탈 관리 Tip을 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'beauty', label: '뷰티 패션', prompt: '뷰티 패션 Tip을 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'app', label: '앱 활용', prompt: '앱 활용 Tip을 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'safety', label: '안전 비상', prompt: '안전 비상 Tip을 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
      { id: 'camping', label: '캠핑 야외', prompt: '캠핑 할때 Tip을 이전과 다른 2개씩 제공 해 주세요.' + HEALTH_LIFE_INSTRUCTION },
    ]
  },
  {
    id: 'english',
    label: '영어 학습',
    items: [
      { id: 'cafe', label: 'Cafe', prompt: 'Cafe 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'phone', label: 'Phone', prompt: 'Phone 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'travel', label: 'Travel', prompt: 'Travel 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'work', label: 'Work', prompt: 'Work 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'hotel', label: 'Hotel', prompt: 'Hotel 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'airport', label: 'Airport', prompt: 'Airport 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'hospital', label: 'Hospital', prompt: 'Hospital 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'restaurant', label: 'Restaurant', prompt: 'Restaurant 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'shopping', label: 'Shopping', prompt: 'Shopping 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'business', label: 'Business', prompt: 'Business 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'emergency', label: 'Emergency', prompt: 'Emergency 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'street', label: 'Street', prompt: 'Street 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'chatter', label: 'Chatter', prompt: 'Chatter 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'topic', label: 'Topic', prompt: 'Topic 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'general', label: 'General', prompt: 'General 관련된 상황에 맞게 상황극 영어 대화를 3~6줄씩 3개를 이전과 다르게 만들어 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'beg_word', label: '초급 단어', prompt: '초급~중급에 해당하는 영어 단어를 10개씩 보여주며 발음을 주고 번역 해 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'int_word', label: '중급 단어', prompt: '중급~고급에 해당하는 영어 단어를 10개씩 보여주며 발음을 주고 번역 해 주세요.' + ENGLISH_INSTRUCTION },
      { id: 'adv_word', label: '고급 단어', prompt: '고급~전문에 해당하는 영어 단어를 10개씩 보여주며 발음을 주고 번역 해 주세요.' + ENGLISH_INSTRUCTION },
    ]
  }
];
