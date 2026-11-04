// 호별 <삼양인 한 표> 설정. closesAt은 마감 시각(UTC). 금요일 오후 6시(KST) = 같은 날 09:00Z.
export const GIFT_RULE =
  '응답하신 분 가운데 추첨해 기프티콘을 드립니다(회당 10만 원 이내). 당첨자는 다음 주 레터에서 발표하고, 발표 후 7영업일 안에 보내 드립니다.';

export const POLLS = {
  '2027-01-06': {
    issueLabel: '1월 6일',
    resultIssueLabel: '1월 13일',
    title: '삼양인 한 표 · 1월 6일',
    type: 'choice',
    question: '2월부터 <삼양 사람들>이 가장 먼저 찾아갔으면 하는 곳은?',
    closesAt: '2027-01-08T09:00:00Z',
    options: [
      { code: 'holdings', label: '삼양홀딩스' },
      { code: 'samyangsa', label: '삼양사' },
      { code: 'packaging', label: '삼양패키징' },
      { code: 'biopharm', label: '삼양바이오팜' },
      { code: 'kci', label: '삼양케이씨아이' },
      { code: 'innochem', label: '삼양이노켐' },
      { code: 'ulsan', label: '울산 공장' },
      { code: 'daejeon', label: '대전 사업장' },
      { code: 'pangyo', label: '판교 연구소' },
      { code: 'hungary', label: '헝가리 공장' },
      { code: 'soda', label: '일본 소다 아로마틱' },
    ],
  },
  '2027-01-13': {
    issueLabel: '1월 13일',
    resultIssueLabel: '1월 20일',
    title: '삼양인 한 표 · 1월 13일',
    type: 'text',
    question: '3월 리더 인터뷰에서 꼭 묻고 싶은 질문은 무엇인가요?',
    hint: '보내 주신 분의 이름은 싣지 않습니다. 인터뷰에 쓸 질문은 커뮤니케이션팀과 함께 고릅니다.',
    placeholder: '예) 올해 우리 계열사에서 가장 먼저 바뀌는 것은 무엇인가요?',
    closesAt: '2027-01-15T09:00:00Z',
  },
  '2027-01-20': {
    issueLabel: '1월 20일',
    resultIssueLabel: '1월 27일',
    title: '삼양인 한 표 · 1월 20일',
    type: 'choice',
    question: '점심시간, 주로 어떻게 보내세요?',
    closesAt: '2027-01-22T09:00:00Z',
    options: [
      { code: 'cafeteria', label: '구내식당에서' },
      { code: 'outside', label: '밖에서 동료와 함께' },
      { code: 'desk', label: '자리에서 간단히' },
      { code: 'break', label: '산책·운동·휴식' },
    ],
  },
};
