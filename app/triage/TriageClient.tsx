"use client";
// /app/triage/TriageClient.tsx
// The email summary: paste inbox rows or whole emails, drop or paste a
// screenshot of an inbox (read in the browser), or load fifteen sample
// emails; one button summarises them. Everything runs here, in the
// browser — lib/triage/engine.ts reads, classes and summarises, and
// lib/triage/ocr.ts reads screenshots — so nothing is sent anywhere.
//
// Ported from kuchimoto.com's /demo-triage (2026-10-20), restyled with
// Ittsui's tokens, in the app language, and joined to the rest of Ittsui:
// a meeting found in an email goes to the rendez-vous request form
// (see BriefView.tsx).

import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import Link from "next/link";
import { INK, MUTED, ACCENT, BORDER } from "@/lib/theme";
import { pagePath, type Locale } from "@/lib/i18n";
import { triage, type Brief } from "@/lib/triage/engine";
import { SAMPLE_INBOX } from "@/lib/triage/samples";
import { readScreenshot, type OcrProgress } from "@/lib/triage/ocr";
import { useLang } from "@/app/components/site/LangProvider";
import { AppLangSwitch } from "@/app/components/site/AppLangSwitch";
import { localeTypography } from "@/app/components/site/typography";
import { BriefView } from "./BriefView";

type Tab = "text" | "image" | "sample";
type Ocr = { status: "idle" | "running" | "done" | "error"; stage: OcrProgress["stage"]; progress: number; text: string };

const IMAGE_TYPES = /^image\/(png|jpe?g|webp)$/;

const COPY: Record<
  Locale,
  {
    home: string;
    title: string;
    intro: string;
    privacy: string;
    tabsLabel: string;
    tabs: Record<Tab, string>;
    pasteLabel: string;
    pasteHelp: string;
    placeholder: string;
    drop: string;
    dropHint: string;
    imageAlt: string;
    ocrLoading: string;
    ocrReading: (percent: number) => string;
    ocrError: string;
    ocrRead: (lines: number) => string;
    ocrTextLabel: string;
    sample: string;
    sampleButton: string;
    analyze: string;
    badFormat: string;
    tooBig: string;
    stillReading: string;
    nothingRead: string;
    nothingPasted: string;
    noneFound: string;
    mode: string;
  }
> = {
  fr: {
    home: "← Accueil",
    title: "Résumez vos e-mails",
    intro:
      "Collez votre boîte de réception ou une capture d'écran : Ittsui en tire les priorités, les dates limites et les rendez-vous à caler, et met le bruit de côté.",
    privacy: "Tout se passe dans votre navigateur : vos e-mails et vos captures ne sont envoyés nulle part.",
    tabsLabel: "Source des e-mails",
    tabs: { text: "Coller mes e-mails", image: "Capture d'écran", sample: "Essayer avec un exemple" },
    pasteLabel: "Collez vos e-mails",
    pasteHelp:
      "Dans Gmail ou Outlook, sélectionnez 10 à 100 lignes de la boîte de réception (ou Ctrl+A), copiez avec Ctrl+C et collez ici. Les e-mails complets (De, Objet, Date) fonctionnent aussi.",
    placeholder: "Expéditeur\tObjet - extrait du message\t10:42\n…",
    drop: "Glissez une capture ici, collez-la (Ctrl+V) ou touchez pour la choisir",
    dropHint: "Capture de Gmail ou d'Outlook, en PNG, JPG ou WebP.",
    imageAlt: "Votre capture de boîte de réception",
    ocrLoading: "Chargement de la lecture de texte (une fois par visite)…",
    ocrReading: (percent) => `Lecture de la capture… ${percent} %`,
    ocrError: "La capture n'a pas pu être lue. Essayez une autre image, ou collez le texte.",
    ocrRead: (lines) => `Texte lu sur la capture (${lines} lignes) : vérifier ou corriger`,
    ocrTextLabel: "Texte lu sur la capture",
    sample:
      "Quinze e-mails fictifs, tels que Gmail les donne quand on copie des lignes de la boîte de réception. Ils sont placés dans la zone de texte et résumés aussitôt.",
    sampleButton: "Charger les 15 e-mails d'exemple",
    analyze: "Résumer mes e-mails →",
    badFormat: "Formats acceptés : PNG, JPG ou WebP.",
    tooBig: "Image trop lourde (15 Mo au maximum).",
    stillReading: "La capture est encore en cours de lecture.",
    nothingRead: "Aucun texte lu sur la capture. Essayez une capture plus nette, ou collez le texte.",
    nothingPasted: "Collez d'abord des e-mails, ajoutez une capture, ou chargez l'exemple.",
    noneFound: "Aucun e-mail reconnu. Collez des lignes de votre boîte de réception, ou un e-mail complet avec De et Objet.",
    mode: "Résumé fait dans votre navigateur : rien n'a été envoyé.",
  },
  en: {
    home: "← Home",
    title: "Sum up your emails",
    intro:
      "Paste your inbox or a screenshot: Ittsui pulls out the priorities, the deadlines and the meetings to set up, and puts the noise aside.",
    privacy: "Everything happens in your browser: your emails and screenshots are sent nowhere.",
    tabsLabel: "Where the emails come from",
    tabs: { text: "Paste my emails", image: "Screenshot", sample: "Try an example" },
    pasteLabel: "Paste your emails",
    pasteHelp:
      "In Gmail or Outlook, select 10 to 100 rows of your inbox (or Ctrl+A), copy with Ctrl+C and paste here. Whole emails (From, Subject, Date) work too.",
    placeholder: "Sender\tSubject - message preview\t10:42\n…",
    drop: "Drop a screenshot here, paste it (Ctrl+V) or tap to choose one",
    dropHint: "A Gmail or Outlook screenshot, as PNG, JPG or WebP.",
    imageAlt: "Your inbox screenshot",
    ocrLoading: "Loading the text reader (once per visit)…",
    ocrReading: (percent) => `Reading the screenshot… ${percent}%`,
    ocrError: "The screenshot couldn't be read. Try another image, or paste the text.",
    ocrRead: (lines) => `Text read from the screenshot (${lines} lines): check or correct it`,
    ocrTextLabel: "Text read from the screenshot",
    sample:
      "Fifteen fictional emails, as Gmail gives them when you copy inbox rows. They're put in the text box and summed up right away.",
    sampleButton: "Load the 15 sample emails",
    analyze: "Sum up my emails →",
    badFormat: "Accepted formats: PNG, JPG or WebP.",
    tooBig: "Image too large (15 MB maximum).",
    stillReading: "The screenshot is still being read.",
    nothingRead: "No text was read from the screenshot. Try a sharper one, or paste the text.",
    nothingPasted: "Paste some emails first, add a screenshot, or load the example.",
    noneFound: "No email recognised. Paste rows from your inbox, or a whole email with From and Subject.",
    mode: "Summed up in your browser: nothing was sent.",
  },
  ja: {
    home: "← ホーム",
    title: "メールを要約する",
    intro:
      "受信トレイの内容かスクリーンショットを貼り付けると、優先事項、期限、調整したい約束をIttsuiが取り出し、不要なメールは脇によけます。",
    privacy: "処理はすべてブラウザの中で行われ、メールやスクリーンショットがどこかに送信されることはありません。",
    tabsLabel: "メールの入力方法",
    tabs: { text: "メールを貼り付け", image: "スクリーンショット", sample: "サンプルで試す" },
    pasteLabel: "メールを貼り付けてください",
    pasteHelp:
      "GmailやOutlookで受信トレイの10〜100行を選択し（またはCtrl+A）、Ctrl+Cでコピーしてここに貼り付けてください。差出人・件名・日付のついたメールそのものでも使えます。",
    placeholder: "差出人\t件名 - 本文の抜粋\t10:42\n…",
    drop: "スクリーンショットをここにドロップ、貼り付け（Ctrl+V）、またはタップして選択",
    dropHint: "GmailまたはOutlookの画面（PNG、JPG、WebP）。",
    imageAlt: "受信トレイのスクリーンショット",
    ocrLoading: "文字認識を読み込んでいます（初回のみ）…",
    ocrReading: (percent) => `スクリーンショットを読み取り中… ${percent}%`,
    ocrError: "スクリーンショットを読み取れませんでした。別の画像を試すか、テキストを貼り付けてください。",
    ocrRead: (lines) => `読み取ったテキスト（${lines}行）：確認・修正する`,
    ocrTextLabel: "読み取ったテキスト",
    sample:
      "受信トレイの行をコピーしたときにGmailが出力する形式の、架空のメール15通です。テキスト欄に入れて、すぐに要約します。",
    sampleButton: "サンプルの15通を読み込む",
    analyze: "メールを要約する →",
    badFormat: "対応形式：PNG、JPG、WebP",
    tooBig: "画像が大きすぎます（最大15MB）。",
    stillReading: "スクリーンショットを読み取り中です。",
    nothingRead: "スクリーンショットから文字を読み取れませんでした。より鮮明な画像を使うか、テキストを貼り付けてください。",
    nothingPasted: "まずメールを貼り付けるか、スクリーンショットを追加するか、サンプルを読み込んでください。",
    noneFound: "メールを認識できませんでした。受信トレイの行か、差出人と件名のあるメールを貼り付けてください。",
    mode: "ブラウザの中で要約しました。何も送信されていません。",
  },
};

export default function TriageClient({ fontClass, displayFamily }: { fontClass: string; displayFamily: string }) {
  const { lang } = useLang();
  const t = COPY[lang];
  const [tab, setTab] = useState<Tab>("text");
  const [text, setText] = useState("");
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [ocr, setOcr] = useState<Ocr>({ status: "idle", stage: "loading", progress: 0, text: "" });
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  // Re-summarised when the language changes, so the summary follows the switch.
  const [source, setSource] = useState<string | null>(null);
  const output = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image.url);
    },
    [image],
  );

  useEffect(() => {
    if (source !== null) setBrief(triage(source, lang));
  }, [lang, source]);

  useEffect(() => {
    if (brief) output.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // Only on a new summary, not on every language switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const acceptImage = useCallback(
    (file: Blob | null) => {
      if (!file) return;
      if (!IMAGE_TYPES.test(file.type)) {
        setError(t.badFormat);
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setError(t.tooBig);
        return;
      }
      setError(null);
      setSource(null);
      setBrief(null);
      setImage({ blob: file, url: URL.createObjectURL(file) });
      setOcr({ status: "running", stage: "loading", progress: 0, text: "" });
      readScreenshot(file, lang, (progress) => setOcr((current) => ({ ...current, ...progress })))
        .then((read) => setOcr({ status: "done", stage: "reading", progress: 1, text: read }))
        .catch(() => setOcr({ status: "error", stage: "reading", progress: 0, text: "" }));
    },
    [lang, t],
  );

  // Ctrl+V anywhere on the screenshot tab pastes the image.
  useEffect(() => {
    if (tab !== "image") return;
    const onPaste = (event: globalThis.ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.files ?? []).find((item) => IMAGE_TYPES.test(item.type));
      if (file) {
        event.preventDefault();
        acceptImage(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [tab, acceptImage]);

  function analyze(input?: string) {
    setError(null);
    const fromImage = tab === "image" && input === undefined;
    const value = input ?? (fromImage ? ocr.text : text);
    if (!value.trim()) {
      setSource(null);
      setBrief(null);
      setError(fromImage ? (ocr.status === "running" ? t.stillReading : t.nothingRead) : t.nothingPasted);
      return;
    }
    const result = triage(value, lang);
    if (!result.counts.total) {
      setSource(null);
      setBrief(null);
      setError(t.noneFound);
      return;
    }
    setSource(value);
    setBrief(result);
  }

  function loadSample() {
    const sample = SAMPLE_INBOX[lang];
    setText(sample);
    setTab("text");
    analyze(sample);
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    acceptImage(event.dataTransfer.files?.[0] ?? null);
  };
  const onZonePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const file = Array.from(event.clipboardData.files).find((item) => IMAGE_TYPES.test(item.type));
    if (file) {
      event.preventDefault();
      acceptImage(file);
    }
  };

  const reading = tab === "image" && ocr.status === "running";
  const percent = Math.round(ocr.progress * 100);
  const field = "mt-3 w-full rounded-2xl border bg-white px-4 py-3 font-mono text-sm outline-none focus:border-current";

  return (
    <main
      lang={lang === "fr" ? undefined : lang}
      className={`${fontClass} min-h-screen bg-[#FFFDF9] antialiased`}
      style={{ color: INK, ...localeTypography(lang, displayFamily) }}
    >
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <div className="flex items-center justify-between gap-4">
          <Link href={pagePath("home", lang)} className="text-sm" style={{ color: MUTED }}>
            {t.home}
          </Link>
          <AppLangSwitch />
        </div>

        <h1 className="mt-8" style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "clamp(2rem, 4vw, 2.5rem)" }}>
          📬 {t.title}
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed" style={{ color: MUTED }}>
          {t.intro}
        </p>
        <p className="mt-2 text-xs" style={{ color: MUTED }}>
          {t.privacy}
        </p>

        <div role="tablist" aria-label={t.tabsLabel} className="mt-8 flex flex-wrap gap-2">
          {(Object.keys(t.tabs) as Tab[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`tab-${key}`}
              aria-selected={tab === key}
              aria-controls={`panel-${key}`}
              onClick={() => setTab(key)}
              className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm transition-colors"
              style={tab === key ? { backgroundColor: ACCENT, borderColor: ACCENT, color: "white" } : { borderColor: BORDER, color: INK, backgroundColor: "white" }}
            >
              {t.tabs[key]}
            </button>
          ))}
        </div>

        <div className="mt-4 rounded-3xl border bg-white p-5 sm:p-6" style={{ borderColor: BORDER }}>
          {tab === "text" && (
            <div role="tabpanel" id="panel-text" aria-labelledby="tab-text">
              <label htmlFor="triage-text" className="block text-sm font-medium">
                {t.pasteLabel}
              </label>
              <p className="mt-1 text-sm" style={{ color: MUTED }}>
                {t.pasteHelp}
              </p>
              <textarea
                id="triage-text"
                rows={11}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={t.placeholder}
                className={field}
                style={{ borderColor: BORDER }}
              />
            </div>
          )}

          {tab === "image" && (
            <div role="tabpanel" id="panel-image" aria-labelledby="tab-image">
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInput.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileInput.current?.click();
                  }
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={onDrop}
                onPaste={onZonePaste}
                className="grid min-h-48 cursor-pointer place-items-center rounded-2xl border border-dashed p-6 text-center"
                style={{ borderColor: BORDER, backgroundColor: "#FFFDF9" }}
              >
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a local preview (blob URL), not an optimisable asset
                  <img src={image.url} alt={t.imageAlt} className="max-h-72 w-auto rounded-xl border" style={{ borderColor: BORDER }} />
                ) : (
                  <div>
                    <p className="font-medium">{t.drop}</p>
                    <p className="mt-1 text-sm" style={{ color: MUTED }}>
                      {t.dropHint}
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                onChange={(event) => acceptImage(event.target.files?.[0] ?? null)}
              />
              {ocr.status === "running" && (
                <div className="mt-4" aria-live="polite">
                  <p className="text-sm">{ocr.stage === "loading" ? t.ocrLoading : t.ocrReading(percent)}</p>
                  <div aria-hidden className="mt-2 h-1.5 rounded-full" style={{ backgroundColor: BORDER }}>
                    <div
                      className="h-1.5 rounded-full transition-[width]"
                      style={{ backgroundColor: ACCENT, width: `${ocr.stage === "loading" ? 8 : Math.max(8, percent)}%` }}
                    />
                  </div>
                </div>
              )}
              {ocr.status === "error" && (
                <p className="mt-4 text-sm" style={{ color: ACCENT }}>
                  {t.ocrError}
                </p>
              )}
              {ocr.status === "done" && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm">{t.ocrRead(ocr.text.split("\n").filter(Boolean).length)}</summary>
                  <textarea
                    rows={8}
                    value={ocr.text}
                    onChange={(event) => setOcr((current) => ({ ...current, text: event.target.value }))}
                    className={field}
                    style={{ borderColor: BORDER }}
                    aria-label={t.ocrTextLabel}
                  />
                </details>
              )}
            </div>
          )}

          {tab === "sample" && (
            <div role="tabpanel" id="panel-sample" aria-labelledby="tab-sample">
              <p className="text-sm" style={{ color: MUTED }}>
                {t.sample}
              </p>
              <button
                type="button"
                onClick={loadSample}
                className="mt-4 inline-flex min-h-12 items-center justify-center rounded-full border px-6 text-sm font-medium transition-transform hover:scale-[1.02]"
                style={{ borderColor: ACCENT, color: ACCENT }}
              >
                {t.sampleButton}
              </button>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => analyze()}
              disabled={reading}
              className="inline-flex min-h-12 items-center justify-center rounded-full px-7 text-sm font-medium text-white transition-transform hover:scale-[1.02] disabled:opacity-60"
              style={{ backgroundColor: ACCENT }}
            >
              {reading ? t.ocrReading(percent) : t.analyze}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-4 rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: `${ACCENT}55`, color: ACCENT, backgroundColor: `${ACCENT}0D` }}>
              {error}
            </p>
          )}
        </div>

        <div ref={output} className="scroll-mt-6">
          {brief && (
            <div className="mt-12">
              <BriefView brief={brief} mode={t.mode} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
