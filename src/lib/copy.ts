import type { Locale } from "@/lib/locale-shared";

const phrases: Record<string, Record<Locale, string>> = {
  "Sick sinus syndrome": {
    "zh-HK": "病態竇房結綜合徵",
    en: "Sick sinus syndrome",
  },
  "Chemical pneumonitis": {
    "zh-HK": "化學性肺炎",
    en: "Chemical pneumonitis",
  },
  "Occasional headache": { "zh-HK": "偶爾頭痛", en: "Occasional headache" },
  "Paracetamol 500 mg tablet": {
    "zh-HK": "撲熱息痛 500 毫克",
    en: "Paracetamol 500 mg tablet",
  },
  "Atenolol 50 mg tablet": {
    "zh-HK": "阿替洛爾 50 毫克",
    en: "Atenolol 50 mg tablet",
  },
  "Palpitations today?": { "zh-HK": "今日有心悸嗎？", en: "Palpitations today?" },
  "How long have the palpitations lasted?": {
    "zh-HK": "心悸持續了多久？",
    en: "How long have the palpitations lasted?",
  },
  "Medicine to order for this visit": {
    "zh-HK": "今次要開的藥",
    en: "Medicine to order for this visit",
  },
  Today: { "zh-HK": "今日", en: "Today" },
  "This week": { "zh-HK": "本週", en: "This week" },
  "Longer than a week": { "zh-HK": "超過一週", en: "Longer than a week" },
  "Sample visit form": { "zh-HK": "就診表格", en: "Visit form" },
};

export function phrase(locale: Locale, text: string) {
  return phrases[text]?.[locale] ?? text;
}

const ui = {
  "zh-HK": {
    patients: "病人",
    pickPatient: "從左邊選擇一位病人",
    signIn: "登入",
    email: "電郵",
    password: "密碼",
    signInFailed: "電郵或密碼不正確",
    toggle: "打開病人名單",
    close: "關閉病人名單",
    history: "就診",
    visit: "門診",
    date: "日期",
    ended: "結束",
    doctor: "醫生",
    place: "地點",
    answers: "答案",
    noAnswers: "這次就診未有答案",
    noVisits: "未有就診",
    record: "填寫這次就診",
    newVisit: "新一次就診",
    save: "儲存答案",
    saved: "已儲存",
    yes: "有",
    no: "沒有",
    choose: "請選擇",
    required: "請回答必填問題",
    withheld: "不提供",
    empty: "—",
    active: "仍在",
    inactive: "已不再",
    resolved: "已解決",
    planned: "已安排",
    "in-progress": "進行中",
    finished: "已完成",
    cancelled: "已取消",
    female: "女",
    male: "男",
    other: "其他",
    unknown: "不詳",
  },
  en: {
    patients: "Patients",
    pickPatient: "Choose a patient on the left",
    signIn: "Sign in",
    email: "Email",
    password: "Password",
    signInFailed: "Email or password is wrong",
    toggle: "Open the patient list",
    close: "Close the patient list",
    history: "Visits",
    visit: "Clinic visit",
    date: "Date",
    ended: "Ended",
    doctor: "Doctor",
    place: "Place",
    answers: "Answers",
    noAnswers: "No answers for this visit",
    noVisits: "No visits",
    record: "Record this visit",
    newVisit: "New visit",
    save: "Save answers",
    saved: "Saved",
    yes: "Yes",
    no: "No",
    choose: "Choose",
    required: "Answer the required questions",
    withheld: "Not offered",
    empty: "—",
    active: "Ongoing",
    inactive: "No longer",
    resolved: "Resolved",
    planned: "Planned",
    "in-progress": "In progress",
    finished: "Finished",
    cancelled: "Cancelled",
    female: "Female",
    male: "Male",
    other: "Other",
    unknown: "Unknown",
  },
} as const;

export type Copy = { [K in keyof (typeof ui)["zh-HK"]]: string };

export function t(locale: Locale): Copy {
  return ui[locale];
}

export function displayName(
  locale: Locale,
  row: { name_text: string; family_name: string; given_name: string },
) {
  if (locale === "zh-HK") return row.name_text;
  return `${row.given_name} ${row.family_name}`;
}
