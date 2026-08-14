export const SCREENS = ["White", "Red", "Green", "Blue", "Black"];

// shortLabel은 목록 화면의 "NG 요약" 열처럼 공간이 좁은 곳에서만 쓰는 표시용 축약어다.
// value(저장/검증에 쓰이는 원문)와 한 쌍으로 묶어 두어서, 항목을 추가/변경할 때
// 축약어를 깜빡 빠뜨려 요약 열에만 원문이 섞여 나오는 일이 생기지 않게 한다.
export const DEFECT_TYPE_OPTIONS = [
  { value: "픽셀 이상", shortLabel: "픽셀" },
  { value: "줄 이상", shortLabel: "라인" },
  { value: "국소적 색 이상", shortLabel: "얼룩" },
  { value: "화면 미출력", shortLabel: "미출력" },
];

export const DEFECT_TYPES = DEFECT_TYPE_OPTIONS.map((option) => option.value);
