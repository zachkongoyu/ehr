const areas = [
  ["respiratory", "Respiratory", "呼吸系統", ["Cough", "Sore throat"], ["咳嗽", "喉嚨痛"], "Breathlessness and chest pain", "呼吸困難及胸痛"],
  ["cardiac", "Cardiovascular", "心血管", ["Palpitations"], ["心悸"], "Onset and symptom course", "開始時間及病程"],
  ["digestive", "Digestive", "消化系統", ["Abdominal pain", "Vomiting"], ["腹痛", "嘔吐"], "Location, associated symptoms and course", "部位、相關症狀及病程"],
  ["neurological", "Neurological", "神經系統", ["Headache", "Dizziness"], ["頭痛", "頭暈"], "Onset and associated symptoms", "開始時間及相關症狀"],
  ["musculoskeletal", "Musculoskeletal", "肌肉骨骼", ["Joint pain", "Back pain"], ["關節痛", "背痛"], "Location, injury and effect on function", "部位、受傷情況及功能影響"],
  ["skin", "Skin", "皮膚", ["Rash"], ["皮疹"], "Appearance, distribution and course", "外觀、分佈及病程"],
  ["urinary", "Urinary", "泌尿系統", ["Urinary symptoms"], ["泌尿症狀"], "Onset and associated symptoms", "開始時間及相關症狀"],
  ["reproductive", "Reproductive", "生殖系統", ["Reproductive concern"], ["生殖健康問題"], "Relevant history and symptoms", "相關病史及症狀"],
  ["mental", "Mental health", "精神健康", ["Mood concern", "Sleep concern"], ["情緒問題", "睡眠問題"], "Duration and effect on daily life", "持續時間及對日常生活的影響"],
  ["ent", "Eyes, ears and nose", "眼、耳及鼻", ["Eye symptoms", "Ear symptoms", "Nasal symptoms"], ["眼部症狀", "耳部症狀", "鼻部症狀"], "Location, onset and course", "部位、開始時間及病程"],
  ["general", "General and other", "全身及其他", ["Fever", "Fatigue"], ["發燒", "疲倦"], "Symptom course and examination", "病程及檢查"],
] as const;

export const consultationAreas = areas.map(([id, en, zh, symptomsEn, symptomsZh, detailEn, detailZh]) => ({
  id, en, zh, symptomsEn, symptomsZh, detailEn, detailZh,
}));
