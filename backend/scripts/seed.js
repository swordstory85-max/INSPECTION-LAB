const { createInspection } = require("../inspections.js");

function okScreen(screen) {
  return { screen, result: "OK", defect_types: [], note: "" };
}

const seedInspections = [
  {
    model_name: "TV-65A",
    tv_serial_number: "SN000001",
    inspector_name: "김검사",
    inspector_id: "10001",
    inspector_contact: "010-1111-0001",
    screens: [
      okScreen("White"),
      okScreen("Red"),
      okScreen("Green"),
      okScreen("Blue"),
      okScreen("Black"),
    ],
  },
  {
    model_name: "TV-65A",
    tv_serial_number: "SN000001",
    inspector_name: "김검사",
    inspector_id: "10001",
    inspector_contact: "010-1111-0001",
    screens: [
      okScreen("White"),
      {
        screen: "Red",
        result: "NG",
        defect_types: ["줄 이상"],
        note: "Red 화면에서 세로줄 발견, 재검사 필요",
      },
      okScreen("Green"),
      okScreen("Blue"),
      okScreen("Black"),
    ],
  },
  {
    model_name: "TV-75B",
    tv_serial_number: "SN000002",
    inspector_name: "이검사",
    inspector_id: "10002",
    inspector_contact: "010-2222-0002",
    screens: [
      {
        screen: "White",
        result: "NG",
        defect_types: ["화면 미출력"],
        note: "White 화면 전환 시 화면 미출력, 패널 점검 요청",
      },
      okScreen("Red"),
      okScreen("Green"),
      okScreen("Blue"),
      okScreen("Black"),
    ],
  },
];

function runSeed() {
  let succeeded = 0;

  for (const [index, inspection] of seedInspections.entries()) {
    try {
      createInspection(inspection);
      succeeded += 1;
    } catch (error) {
      console.error(
        `시드 실패: index=${index} serial=${inspection.tv_serial_number} - ${error.message}`,
      );
      throw error;
    }
  }

  console.log(`시드 완료: 검사 기록 ${succeeded}건 생성`);
}

if (require.main === module) {
  runSeed();
}

module.exports = { seedInspections, runSeed };
