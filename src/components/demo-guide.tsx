"use client";
import Link from "next/link";
import { useId, useState } from "react";
import { usePathname } from "next/navigation";
import { BookOpen, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Locale } from "@/lib/locale-shared";

type Step = { title: string; body: string };

export function DemoGuide({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  return <PageGuide key={pathname} pathname={pathname} locale={locale}/>;
}

function PageGuide({ pathname, locale }: { pathname: string; locale: Locale }) {
  const en = locale === "en";
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const id = useId();
  let title: string, hint: string, steps: Step[];
  if (/\/visits\/\d+$/.test(pathname)) {
    title = en ? "Document a consultation" : "記錄診症";
    hint = en ? "Work through the visit, save a draft, then complete when ready." : "按步驟記錄診症，先儲存草稿，準備好後才完成。";
    steps = en ? [
      {title:"Review the patient first",body:"Confirm the name and chart number above. Review allergies, ongoing problems and medication records before entering this visit."},
      {title:"Enter the clinical record",body:"Start with the presenting complaint and measured vitals. Add the history, examination, assessment, management plan and follow-up in their labelled sections. Leave unmeasured vitals blank."},
      {title:"Add diagnoses and prescriptions",body:"Enter one diagnosis per line. Add a prescription, search for the product, select it, then enter dose, route and frequency. Suggestions are optional; enter the intended instructions yourself."},
      {title:"Save, review and complete",body:"Save draft keeps the visit editable and restores your entries after reloading. Review the record, then use Complete visit when finished. Completion makes the record read-only and activates its prescription orders."},
    ] : [
      {title:"先核對病人",body:"核對上方姓名及病歷編號，並查看過敏、持續健康問題及用藥記錄，再開始本次診症。"},
      {title:"填寫臨床記錄",body:"先填主訴及已量度的生命表徵，再記錄病史、檢查、評估、診療計劃及跟進。未量度的項目請留空。"},
      {title:"加入診斷及處方",body:"每行填寫一項診斷。新增處方後搜尋及選擇藥物，再輸入劑量、途徑及頻次。建議選項並非必填，請自行填寫適當指示。"},
      {title:"儲存、覆核及完成",body:"「儲存草稿」保留可編輯狀態，重新載入後可繼續。覆核後按「完成診症」，病歷即轉為唯讀，處方醫囑亦會啟用。"},
    ];
  } else if (pathname.endsWith("/new") || pathname.endsWith("/edit")) {
    title = en ? "Register or update a patient" : "登記或更新病人";
    hint = en ? "Use a clearly labelled synthetic patient while exploring this demo." : "體驗示範時，請使用清楚標示的虛構病人資料。";
    steps = en ? [
      {title:"Identify the patient",body:"Enter a unique chart number, display name, family and given names, date of birth and sex. Required fields are marked."},
      {title:"Add the available details",body:"Fill contact and identity fields only when available. This demo uses fictional records; avoid entering real patient details."},
      {title:"Save and open the chart",body:"Save the form to open the patient chart. From there you can review history or start a consultation."},
    ] : [
      {title:"識別病人",body:"輸入獨有病歷編號、顯示名稱、姓氏及名字、出生日期和性別。必填欄位會有標示。"},
      {title:"補充已知資料",body:"按需要填寫聯絡及身份資料。此版本使用虛構記錄，請勿輸入真實病人資料。"},
      {title:"儲存並開啟病歷",body:"儲存後會開啟病人病歷，您可查看過往記錄或開始診症。"},
    ];
  } else if (/^\/patients\/\d+$/.test(pathname)) {
    title = en ? "Explore the patient chart" : "認識病人病歷";
    hint = en ? "The tabs organise the chart; the timeline opens individual visits." : "分類頁籤整理病歷；時間軸可開啟個別就診。";
    steps = en ? [
      {title:"Confirm the patient and clinical context",body:"Check the name and chart number. Overview brings together allergies, ongoing problems, medication records and the latest recorded vitals."},
      {title:"Follow the visit timeline",body:"Choose a visit in the timeline to read its clinical record. Dates and status distinguish open drafts from completed visits. Green means completed."},
      {title:"Use the chart sections",body:"Clinical data shows a selected visit. Medications shows recorded medicines and orders. Care plans collects documented plans and follow-up. Patient profile holds demographic details."},
      {title:"Begin the next consultation",body:"Use New consultation, or Resume consultation if a visit is already open. In Overview, Vital trends lets you switch between blood pressure, weight and pulse across recorded visits."},
    ] : [
      {title:"核對病人及臨床背景",body:"核對姓名及病歷編號。總覽集中顯示過敏、持續健康問題、用藥記錄及最近生命表徵。"},
      {title:"沿時間軸查看就診",body:"在時間軸選擇一次就診以閱讀病歷。日期及狀態可區分草稿與已完成診症，綠色代表已完成。"},
      {title:"使用病歷分類",body:"臨床資料顯示所選就診；藥物顯示用藥及醫囑；診療計劃整理已記錄的計劃及跟進；病人資料儲存基本資料。"},
      {title:"開始下一次診症",body:"按新增診症，或繼續現有未完成診症。總覽的生命表徵趨勢可切換血壓、體重及脈搏，查看過往量度。"},
    ];
  } else if (pathname === "/medications") {
    title = en ? "Find a medicine" : "尋找藥物";
    hint = en ? "This catalogue lists products available in the prescription editor." : "此目錄列出處方編輯器可選用的藥物。";
    steps = en ? [
      {title:"Search the catalogue",body:"Search by medicine name, strength or stored product code, then press Search. Clear the search to see the full catalogue."},
      {title:"Read the identifiers",body:"Local codes identify products inside this demo. HKCTT and RPP identifiers appear only where stored; a dash means no mapping is recorded."},
      {title:"Prescribe within a visit",body:"Open a patient and start or resume a consultation. Use Add prescription in the editor, select the product, and document the intended instructions."},
    ] : [
      {title:"搜尋目錄",body:"輸入藥物名稱、劑量或產品編號後按搜尋。清除搜尋可查看全部藥物。"},
      {title:"閱讀藥物編號",body:"本地編號識別示範內的產品。HKCTT及RPP只顯示已儲存的編號；破折號代表未有對應記錄。"},
      {title:"於診症中開處方",body:"開啟病人並開始或繼續診症，在編輯器新增處方，選擇藥物並填寫指示。"},
    ];
  } else if (pathname === "/consultations") {
    title = en ? "Use the consultation worklist" : "使用診症工作清單";
    hint = en ? "Filter the full list here; the dashboard keeps only a short overview." : "在此篩選完整清單；總覽只顯示精簡摘要。";
    steps = en ? [
      {title:"Choose the right list",body:"Select Today, Open, Completed or All visits. You can also search for a patient, complaint or doctor, then press Filter."},
      {title:"Continue or review",body:"Resume opens an unfinished consultation for editing. Review opens the clinical record of a completed visit. Completed visits are marked green."},
      {title:"Start a new visit",body:"Use Start consultation to find the patient first, then start the visit from their chart. An existing open visit is resumed rather than duplicated."},
    ] : [
      {title:"選擇清單",body:"選擇今日、未完成、已完成或全部就診，也可搜尋病人、主訴或醫生，再按篩選。"},
      {title:"繼續或覆核",body:"繼續可編輯未完成診症；查看可閱讀已完成病歷。綠色標示已完成就診。"},
      {title:"開始新診症",body:"按開始診症先尋找病人，再從病歷開始。若已有未完成診症，系統會繼續該次診症，避免重複新增。"},
    ];
  } else if (pathname === "/patients") {
    title = en ? "Find a patient and start a visit" : "尋找病人並開始診症";
    hint = en ? "Try a patient marked Demo to explore a complete example chart." : "選擇標示為示例的病人，體驗完整病歷。";
    steps = en ? [
      {title:"Find the patient",body:"Search by name, chart number or phone. Demo patients have five example visits so you can explore a populated timeline."},
      {title:"Open their chart",body:"Select the patient's name to review their summary, allergies, medicines and visit history before starting a consultation."},
      {title:"Register or consult",body:"For a new person, use Register patient. For an existing patient, open the chart and choose New consultation or Resume consultation."},
    ] : [
      {title:"尋找病人",body:"按姓名、病歷編號或電話搜尋。示例病人各有五次就診，可體驗已填寫的時間軸。"},
      {title:"開啟病歷",body:"點選病人姓名，在開始診症前查看摘要、過敏、用藥及就診記錄。"},
      {title:"登記或診症",body:"新病人請按登記病人。現有病人可開啟病歷，再新增或繼續診症。"},
    ];
  } else {
    title = en ? "Your first clinic walkthrough" : "首次使用診所示範";
    hint = en ? "Start here: review clinic activity, find a patient, then document a visit." : "由此開始：查看診所活動、尋找病人，再記錄診症。";
    steps = en ? [
      {title:"Read the clinic overview",body:"The four figures show today's visits, all open consultations, completions today and registered patients. Times use Hong Kong time."},
      {title:"Explore the charts",body:"Monthly activity shows visits started each month, excluding cancellations. Today's status chart shows the status of visits started today. Hover or focus the charts to inspect their values."},
      {title:"Pick up unfinished work",body:"The short Continue consultations list puts the oldest open visits first. Use Resume to edit one, or View all for the complete worklist. Recently completed records open for review."},
      {title:"Try the full workflow",body:"Open Patients, choose a Demo patient, review the chart and start or resume a consultation. Enter notes, save a draft, then complete the visit when ready. Each page has its own guide."},
    ] : [
      {title:"閱讀診所總覽",body:"四個數字分別顯示今日就診、所有未完成診症、今日完成及已登記病人。時間均使用香港時間。"},
      {title:"探索圖表",body:"每月活動顯示各月開始的就診，不包括取消記錄。今日狀態圖顯示今日開始的就診狀態。將游標移到圖表或以鍵盤聚焦可查看數據。"},
      {title:"繼續未完成工作",body:"繼續診症清單優先列出最早的未完成就診。按繼續可編輯，查看全部可開啟完整工作清單。最近完成的病歷可開啟覆核。"},
      {title:"體驗完整流程",body:"到病人頁選擇示例病人，閱讀病歷後新增或繼續診症，填寫資料、儲存草稿，準備好後完成。每頁都有專屬導覽。"},
    ];
  }
  const step = steps[index];
  return <section className={"demo-guide" + (open ? " expanded" : "")} aria-label={en ? "Page tutorial" : "頁面教學"}>
    <div className="guide-intro"><span className="guide-icon"><BookOpen size={18}/></span><div><strong>{title}</strong><p>{hint}</p></div><button type="button" className="guide-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>{open ? <><X size={15}/><span>{en ? "Close guide" : "關閉導覽"}</span></> : <>{en ? "Show me how" : "逐步教學"}<ChevronRight size={15}/></>}</button></div>
    {open && <div id={id} className="guide-walkthrough"><div className="guide-progress" aria-label={en ? "Tutorial progress" : "教學進度"}>{steps.map((item,i) => <button type="button" key={item.title} onClick={() => setIndex(i)} aria-label={`${en ? "Step" : "步驟"} ${i+1}: ${item.title}`} aria-current={i === index ? "step" : undefined} className={i <= index ? "reached" : ""}/>)}</div><div aria-live="polite"><small>{en ? "STEP" : "步驟"} {index+1} / {steps.length}</small><h2>{step.title}</h2><p>{step.body}</p></div><div className="guide-actions"><button type="button" className="button secondary small" disabled={index === 0} onClick={() => setIndex(index-1)}><ChevronLeft size={14}/>{en ? "Back" : "上一步"}</button>{index < steps.length-1 ? <button type="button" className="button primary small" onClick={() => setIndex(index+1)}>{en ? "Next step" : "下一步"}<ChevronRight size={14}/></button> : <button type="button" className="button primary small" onClick={() => {setOpen(false);setIndex(0);}}>{en ? "Got it" : "明白了"}</button>}<Link href="/patients" className="guide-shortcut">{en ? "Try a demo patient" : "體驗示例病人"}</Link></div></div>}
  </section>;
}
