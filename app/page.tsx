// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Copy, Check, Loader2, Sparkles, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  clearSnippets,
  loadSnippets,
  saveSnippet,
  Snippet,
} from "@/lib/db";

type ModelType = "gemini-flash-latest";

interface ParsedResult {
  corrected: string;
  professional: string;
  casual: string;
  genz: string;
}

const EMPTY_RESULT: ParsedResult = {
  corrected: "",
  professional: "",
  casual: "",
  genz: "",
};

const HINT_EXAMPLE =
  'Contoh: "jadi saya tidak perlu melakukan apapun if not using region US-EAST-1 ?"';

export default function HomePage() {
  const [input, setInput] = useState("");
  const [model, setModel] = useState<ModelType>("gemini-flash-latest");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParsedResult>(EMPTY_RESULT);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [filter, setFilter] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [selectedTone, setSelectedTone] = useState("Normal");
  const [showToneSpotlight, setShowToneSpotlight] = useState(false);

  // Tone options
  const toneOptions = [
    "Normal",
    "Casual",
    "Warm",
    "Dramatic",
    "Confident",
    "Thoughtful",
    "Subtle",
    "Sarcasm",
  ];

  // load history dari IndexedDB
  useEffect(() => {
    (async () => {
      const data = await loadSnippets();
      setSnippets(data);
    })();
  }, []);

  // Check for first visit
  useEffect(() => {
    const hasAcceptedTerms = localStorage.getItem("saybetter-terms-accepted");
    if (!hasAcceptedTerms) {
      setShowTerms(true);
    }
  }, []);

  // Check if user has seen the tone feature spotlight
  useEffect(() => {
    const hasSeenToneSpotlight = localStorage.getItem("saybetter-tone-spotlight-seen");
    // Only show spotlight after terms are accepted
    const hasAcceptedTerms = localStorage.getItem("saybetter-terms-accepted");
    if (hasAcceptedTerms && !hasSeenToneSpotlight) {
      // Delay spotlight to avoid overwhelming user on first load
      const timer = setTimeout(() => {
        setShowToneSpotlight(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleDismissSpotlight() {
    localStorage.setItem("saybetter-tone-spotlight-seen", "true");
    setShowToneSpotlight(false);
  }

  function parseReply(reply: string): ParsedResult {
    // simple parsing berdasarkan prefix
    const sections = {
      corrected: "",
      professional: "",
      casual: "",
      genz: "",
    };

    const lines = reply.split("\n");
    let current: keyof ParsedResult | null = null;

    for (const raw of lines) {
      const line = raw.trim();

      if (/^corrected:/i.test(line)) {
        current = "corrected";
        sections.corrected = line.replace(/^corrected:\s*/i, "").trim();
        continue;
      }
      if (/^professional:/i.test(line)) {
        current = "professional";
        sections.professional = line.replace(/^professional:\s*/i, "").trim();
        continue;
      }
      if (/^casual:/i.test(line)) {
        current = "casual";
        sections.casual = line.replace(/^casual:\s*/i, "").trim();
        continue;
      }
      if (/^gen-?z:/i.test(line)) {
        current = "genz";
        sections.genz = line.replace(/^gen-?z:\s*/i, "").trim();
        continue;
      }

      if (current && line) {
        sections[current] += (sections[current] ? " " : "") + line;
      }
    }

    return sections;
  }

  async function handleImprove() {
    if (!input.trim()) return;
    setLoading(true);
    setResult(EMPTY_RESULT);

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input.trim(),
          model,
          tone: selectedTone,
        }),
      });

      console.log("API Response Status:", res.status);
      const data = await res.json();
      console.log("API Response Data:", data);
      const reply: string = data.reply ?? "";
      console.log("Reply:", reply);

      const parsed = parseReply(reply);
      console.log("Parsed Result:", parsed);
      setResult(parsed);

      if (parsed.corrected || parsed.professional || parsed.casual || parsed.genz) {
        const snippet: Omit<Snippet, "id"> = {
          input: input.trim(),
          corrected: parsed.corrected,
          professional: parsed.professional,
          casual: parsed.casual,
          genz: parsed.genz,
          tone: selectedTone,
          createdAt: Date.now(),
        };
        await saveSnippet(snippet);
        const updated = await loadSnippets();
        setSnippets(updated);
      }
    } catch (err) {
      console.error("Error in handleImprove:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleClearHistory() {
    await clearSnippets();
    setSnippets([]);
  }

  function handleClickHistory(s: Snippet) {
    setInput(s.input);
    setResult({
      corrected: s.corrected,
      professional: s.professional,
      casual: s.casual,
      genz: s.genz || "",
    });
    // Restore the tone, default to Normal if not saved
    setSelectedTone(s.tone || "Normal");
  }

  async function handleCopy(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  function handleAcceptTerms() {
    localStorage.setItem("saybetter-terms-accepted", "true");
    setShowTerms(false);
  }

  const filteredSnippets = snippets.filter((s) =>
    filter
      ? s.input.toLowerCase().includes(filter.toLowerCase())
      : true
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Sidebar kiri */}
      <aside className="hidden lg:flex flex-col w-72 border-r bg-white">
        <div className="px-4 py-4 border-b flex items-center gap-2">
          <div className="h-9 w-9 rounded-md bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
            SB
          </div>
          <div>
            <div className="text-sm font-semibold">SayBetter</div>
            <div className="text-xs text-slate-500">
              English sentence improver
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-b space-y-2">
          <div className="text-xs font-medium text-slate-500 uppercase">
            History
          </div>
          <Input
            placeholder="Filter history..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center"
            onClick={handleClearHistory}
          >
            Clear history
          </Button>
        </div>

        <ScrollArea className="flex-1 px-2 py-3">
          <div className="space-y-2">
            {filteredSnippets.length === 0 && (
              <p className="text-xs text-slate-400 px-2">
                Belum ada riwayat. Coba tulis kalimat dan klik Improve.
              </p>
            )}
            {filteredSnippets.map((s) => (
              <button
                key={s.id}
                onClick={() => handleClickHistory(s)}
                className="w-full text-left text-xs px-3 py-2 rounded-md hover:bg-slate-100 border border-transparent hover:border-slate-200 transition"
              >
                <div className="line-clamp-2 text-slate-700">
                  {s.input}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {new Date(s.createdAt).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>

        <div className="px-4 py-3 border-t text-[11px] text-slate-400">
          Semua data disimpan lokal di browser (IndexedDB).
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        <header className="border-b bg-white px-4 lg:px-8 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-base lg:text-lg font-semibold">
              SayBetter – English Rewrite Assistant
            </h1>
            <p className="text-xs text-slate-500">
              Tulis kalimat dalam bahasa Indonesia, Inggris, atau campuran —
              SayBetter akan membantu merapikan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden md:inline">
              Model
            </span>
            <Select
              value={model}
              onValueChange={(v) => setModel(v as ModelType)}
            >
              <SelectTrigger className="w-[170px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="w-[250px] bg-white">
                <SelectItem value="gemini-flash-latest">
                  gemini-flash-latest
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row gap-4 px-4 lg:px-8 py-4">
          {/* Kolom kiri: input */}
          <section className="w-full lg:w-1/2 flex flex-col gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700">
                Your sentence
              </label>
              <Textarea
                rows={8}
                placeholder={HINT_EXAMPLE}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="resize-none"
              />
              <p className="text-[11px] text-slate-500">
                Kamu bisa tulis kalimat email, chat ke atasan, pesan customer,
                dsb. SayBetter hanya membantu bahasa, bukan isi pesan.
              </p>
            </div>

            {/* Emotional Tone Selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-700">
                Emotional Tone
              </label>
              <div className="flex flex-wrap gap-2">
                {toneOptions.map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => setSelectedTone(tone)}
                    className={`
                      px-3 py-1.5 text-xs font-medium rounded-full transition-all
                      ${selectedTone === tone
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-white text-slate-700 border border-slate-300 hover:border-slate-400 hover:shadow-sm"
                      }
                    `}
                  >
                    {tone}
                  </button>
                ))}
              </div>

              {/* Spotlight Feature Introduction */}
              {showToneSpotlight && (
                <div className="relative animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 shadow-sm">
                    <button
                      onClick={handleDismissSpotlight}
                      className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label="Dismiss"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-500 rounded-full p-2 mt-0.5">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 pr-6">
                        <h3 className="text-sm font-semibold text-slate-900 mb-1">
                          ✨ New Feature: Emotional Tone
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Choose an emotional tone to influence your AI results! Select from tones like <strong>Warm</strong>, <strong>Confident</strong>, or <strong>Sarcasm</strong> to get outputs that match your desired style.
                        </p>
                        <button
                          onClick={handleDismissSpotlight}
                          className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          Got it, thanks!
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button onClick={handleImprove} disabled={loading} className="border-2 border-slate-300 hover:border-slate-400 cursor-pointer">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Processing..." : "Improve"}
              </Button>
              <Button
                variant="ghost"
                type="button"
                size="sm"
                onClick={() => {
                  setInput("");
                  setResult(EMPTY_RESULT);
                }}
                className="border border-slate-300 hover:border-slate-400 cursor-pointer"
              >
                Clear input
              </Button>
            </div>

            <Separator />

            <Card className="hidden lg:block">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">
                  Tips penggunaan
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 space-y-1">
                <p>• Cocok untuk perbaiki email kerja, chat profesional, atau caption.</p>
                <p>• Kalau ingin nada tertentu, boleh tulis di kalimatmu, misalnya:</p>
                <p className="italic">
                  “balas email ini dengan sopan tapi tetap tegas: &lt;isi email&gt;”
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Kolom kanan: hasil */}
          <section className="w-full lg:w-1/2 flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3">
              <Card>
                <CardHeader className="py-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Corrected</CardTitle>
                  {result.corrected && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 cursor-pointer"
                      onClick={() => handleCopy(result.corrected, "corrected")}
                    >
                      {copiedField === "corrected" ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {loading && !result.corrected ? (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Processing your text...</span>
                    </div>
                  ) : result.corrected ? (
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">
                      {result.corrected}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Versi yang sudah diperbaiki secara netral akan tampil di sini.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Professional</CardTitle>
                  {result.professional && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 cursor-pointer"
                      onClick={() => handleCopy(result.professional, "professional")}
                    >
                      {copiedField === "professional" ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {result.professional ? (
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">
                      {result.professional}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Versi lebih formal / business English.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Casual</CardTitle>
                  {result.casual && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 cursor-pointer"
                      onClick={() => handleCopy(result.casual, "casual")}
                    >
                      {copiedField === "casual" ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {result.casual ? (
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">
                      {result.casual}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Versi lebih santai untuk teman / chat sehari-hari.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Gen-Z 😎</CardTitle>
                  {result.genz && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 cursor-pointer"
                      onClick={() => handleCopy(result.genz, "genz")}
                    >
                      {copiedField === "genz" ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {result.genz ? (
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">
                      {result.genz}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Versi Gen-Z dengan slang dan emoji trendy.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </main>

      {/* Terms of Service Modal */}
      <Dialog open={showTerms} onOpenChange={() => { }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-xl">Welcome to SayBetter</DialogTitle>
            <DialogDescription className="text-base">
              Please read and accept our terms of service to continue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm text-slate-700">
            <section>
              <h3 className="font-semibold text-base mb-2">1. Service Overview</h3>
              <p>
                SayBetter is an AI-powered English writing assistant that helps improve your sentences by detecting mixed Indonesian and English text, fixing grammar, and providing multiple writing style variations.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">2. Data Privacy</h3>
              <p className="mb-2">
                <strong>Your Privacy Matters:</strong>
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>All your data is stored <strong>locally</strong> in your browser using IndexedDB</li>
                <li>Your text inputs and results are <strong>never saved</strong> to any server or database</li>
                <li>We only send your text to Google Gemini API for AI processing</li>
                <li>No personal information, account data, or usage statistics are collected</li>
                <li>You can clear all your local data at any time using the "Clear History" button</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">3. Third-Party Services</h3>
              <p className="mb-2">
                This application uses the Google Gemini API to process your text. By using SayBetter, you acknowledge that:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Your input text is sent to Google's servers for AI processing</li>
                <li>Google's terms of service and privacy policy apply to this data processing</li>
                <li>We recommend not entering sensitive, confidential, or personal information</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">4. Acceptable Use</h3>
              <p className="mb-2">You agree to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Use SayBetter only for lawful purposes</li>
                <li>Not use the service for generating harmful, abusive, or illegal content</li>
                <li>Not attempt to reverse engineer or exploit the application</li>
                <li>Respect intellectual property rights</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">5. Disclaimer</h3>
              <p>
                SayBetter is provided "as is" without warranties of any kind. While we strive for accuracy, AI-generated suggestions may contain errors. You are responsible for reviewing and verifying all outputs before use.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">6. Changes to Terms</h3>
              <p>
                We may update these terms at any time. Continued use of the application constitutes acceptance of any changes.
              </p>
            </section>

            <section className="bg-slate-50 p-3 rounded-md border border-slate-200">
              <p className="text-xs text-slate-600">
                <strong>Last Updated:</strong> November 27, 2025
              </p>
            </section>
          </div>

          <DialogFooter>
            <Button onClick={handleAcceptTerms} className="w-full sm:w-auto cursor-pointer">
              I Accept - Continue to SayBetter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
