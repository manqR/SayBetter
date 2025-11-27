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
import { Copy, Check } from "lucide-react";

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

  // load history dari IndexedDB
  useEffect(() => {
    (async () => {
      const data = await loadSnippets();
      setSnippets(data);
    })();
  }, []);

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

            <div className="flex items-center justify-between gap-3">
              <Button onClick={handleImprove} disabled={loading} className="border-2 border-slate-300 hover:border-slate-400 cursor-pointer">
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
                    <p className="text-xs text-slate-400">Working on it...</p>
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
    </div>
  );
}
