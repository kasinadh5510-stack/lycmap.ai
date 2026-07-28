import { useState } from "react";
import { useLocation } from "wouter";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings2, Loader2, Sparkles, AlertCircle,
  Calculator, FileText, ChevronRight, ChevronDown,
  BookOpen, Zap,
} from "lucide-react";
import { useGenerateQuiz, useGetFormulaSheet, useGetShortNotes } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const setupSchema = z.object({
  board: z.string().min(1, "Please select a board"),
  className: z.string().min(1, "Please select a class"),
  subject: z.string().min(2, "Subject is required"),
  chapter: z.string().min(2, "Chapter is required"),
  level: z.string().min(1, "Please select difficulty"),
  questionCount: z.coerce.number().min(5).max(50).default(20),
});

type ChapterReq = { board: string; className: string; subject: string; chapter: string };

/* ─── inline formula section ─── */
function FormulaContent({ formulas }: { formulas: any }) {
  return (
    <div className="space-y-6">
      {formulas.sections?.map((section: any, i: number) => (
        <div key={i}>
          <h4 className="font-semibold text-sm text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-primary rounded-full" />
            {section.sectionTitle}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {section.formulas?.map((f: any, j: number) => (
              <div key={j} className="bg-background/50 border border-border/40 rounded-xl p-4 hover:border-primary/30 transition-colors">
                <p className="text-xs font-medium text-primary mb-2">{f.name}</p>
                <p className="font-mono text-base bg-secondary/30 px-3 py-1.5 rounded-lg border border-border/40 mb-2 tracking-tight">
                  {f.formula}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                {f.unit && (
                  <span className="mt-2 inline-block text-xs font-mono bg-accent/10 text-accent px-2 py-0.5 rounded">
                    {f.unit}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {formulas.previousYearTopics?.length > 0 && (
        <div className="border-t border-border/30 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            High-frequency PYQ Topics
          </p>
          <div className="flex flex-wrap gap-2">
            {formulas.previousYearTopics.map((t: string, i: number) => (
              <span key={i} className="text-xs bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── inline notes section ─── */
function NotesContent({ notes }: { notes: any }) {
  return (
    <div className="space-y-5">
      {notes.items?.map((item: any, i: number) => (
        <div key={i} className="bg-background/50 border border-border/40 rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
          <div className="bg-secondary/20 px-4 py-3 border-b border-border/30">
            <h4 className="font-semibold text-primary text-sm">{item.heading}</h4>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm text-foreground/80 leading-relaxed">{item.content}</p>
            {item.equations?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {item.equations.map((eq: string, j: number) => (
                  <span key={j} className="font-mono text-xs bg-secondary/40 border border-border/40 px-2 py-1 rounded">
                    {eq}
                  </span>
                ))}
              </div>
            )}
            {item.keyPoints?.length > 0 && (
              <ul className="space-y-1">
                {item.keyPoints.map((kp: string, j: number) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{kp}</span>
                  </li>
                ))}
              </ul>
            )}
            {item.previousYearRelevance && (
              <p className="text-xs text-accent bg-accent/10 border border-accent/20 px-3 py-2 rounded-lg">
                📌 {item.previousYearRelevance}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── collapsible suggestion card ─── */
function SuggestionCard({
  icon: Icon,
  label,
  color,
  isLoading,
  data,
  onFetch,
  children,
}: {
  icon: any;
  label: string;
  color: string;
  isLoading: boolean;
  data: any;
  onFetch: () => void;
  children: (data: any) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const handleToggle = () => {
    if (!data && !isLoading) onFetch();
    setOpen((v) => !v);
  };

  return (
    <div className={`border rounded-2xl overflow-hidden transition-colors ${open ? "border-primary/40" : "border-border/40 hover:border-primary/20"} bg-card/60 backdrop-blur`}>
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
          </div>
          <div>
            <p className="font-semibold text-sm">{label}</p>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Generating…" : data ? "Ready — tap to expand" : "Tap to generate"}
            </p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/30 px-5 py-5">
              {isLoading ? (
                <div className="flex items-center justify-center py-10 gap-3 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm">AI is generating content…</span>
                </div>
              ) : data ? (
                children(data)
              ) : (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  Failed to load. <button type="button" className="text-primary underline" onClick={onFetch}>Retry</button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── main page ─── */
export default function QuizSetup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const generateQuiz = useGenerateQuiz();
  const getFormulaSheet = useGetFormulaSheet();
  const getShortNotes = useGetShortNotes();

  const [formulas, setFormulas] = useState<any>(null);
  const [notes, setNotes] = useState<any>(null);
  const [lastFetchedKey, setLastFetchedKey] = useState("");

  const form = useForm<z.infer<typeof setupSchema>>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      board: "",
      className: "",
      subject: "",
      chapter: "",
      level: "Mixed",
      questionCount: 20,
    },
  });

  // Watch all 4 chapter-identifying fields
  const [board, className, subject, chapter] = useWatch({
    control: form.control,
    name: ["board", "className", "subject", "chapter"],
  });

  const isChapterReady =
    board?.length > 0 &&
    className?.length > 0 &&
    subject?.length >= 2 &&
    chapter?.length >= 2;

  const chapterKey = `${board}|${className}|${subject}|${chapter}`;

  // Reset cached data when chapter details change
  const getChapterReq = (): ChapterReq => ({ board, className, subject, chapter });

  const fetchFormulas = () => {
    if (chapterKey !== lastFetchedKey) {
      setFormulas(null);
      setNotes(null);
      setLastFetchedKey(chapterKey);
    }
    getFormulaSheet.mutate(
      { data: getChapterReq() },
      { onSuccess: (d) => setFormulas(d) }
    );
  };

  const fetchNotes = () => {
    if (chapterKey !== lastFetchedKey) {
      setFormulas(null);
      setNotes(null);
      setLastFetchedKey(chapterKey);
    }
    getShortNotes.mutate(
      { data: getChapterReq() },
      { onSuccess: (d) => setNotes(d) }
    );
  };

  const onSubmit = (values: z.infer<typeof setupSchema>) => {
    generateQuiz.mutate(
      { data: values },
      {
        onSuccess: (session) => {
          toast({ title: "Quiz Generated!", description: "Your personalized study session is ready." });
          setLocation(`/quiz/${session.id}`);
        },
        onError: (err: any) => {
          toast({
            title: "Failed to generate quiz",
            description: err?.error || "Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full space-y-6"
      >
        {/* ── Setup Card ── */}
        <Card className="border-border/50 bg-card/60 backdrop-blur overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />

          <CardHeader className="text-center pb-6 pt-10">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <Settings2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">Configure Session</CardTitle>
            <p className="text-muted-foreground text-base mt-1">
              Set up your AI-generated quiz tailored to your syllabus
            </p>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="board"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Education Board</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 bg-background/50 text-base">
                              <SelectValue placeholder="Select board" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CBSE">CBSE</SelectItem>
                            <SelectItem value="ICSE">ICSE</SelectItem>
                            <SelectItem value="SCERT">SCERT</SelectItem>
                            <SelectItem value="Mixed">Mixed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="className"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class / Grade</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 bg-background/50 text-base">
                              <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {["12","11","10","9","8","7","6"].map((c) => (
                              <SelectItem key={c} value={c}>Class {c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Physics, Mathematics" className="h-12 bg-background/50 text-base" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="chapter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chapter / Topic</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Kinematics, Integration" className="h-12 bg-background/50 text-base" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 bg-background/50 text-base">
                              <SelectValue placeholder="Select difficulty" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Easy">Easy</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Hard">Hard (PYQ focus)</SelectItem>
                            <SelectItem value="Mixed">Mixed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="questionCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Questions</FormLabel>
                        <FormControl>
                          <Input type="number" min={5} max={50} className="h-12 bg-background/50 text-base" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full h-14 text-lg font-bold rounded-xl relative overflow-hidden group"
                    disabled={generateQuiz.isPending}
                  >
                    <span className="relative flex items-center justify-center gap-2">
                      {generateQuiz.isPending ? (
                        <><Loader2 className="w-5 h-5 animate-spin" />Curating your quiz…</>
                      ) : (
                        <><Sparkles className="w-5 h-5" />Generate Smart Quiz</>
                      )}
                    </span>
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* ── Study Resources (appears when chapter details are ready) ── */}
        <AnimatePresence>
          {isChapterReady && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.35 }}
              className="space-y-4"
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-1">
                <div className="flex items-center gap-2 text-primary">
                  <Zap className="w-4 h-4" />
                  <span className="font-bold text-base">Study Resources</span>
                </div>
                <div className="flex-1 h-px bg-border/40" />
                <span className="text-xs text-muted-foreground bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {subject} · {chapter}
                </span>
              </div>

              <p className="text-sm text-muted-foreground px-1">
                AI-generated study aids for <strong className="text-foreground">{chapter}</strong>. Open either card to generate content instantly.
              </p>

              {/* Formula Sheet Card */}
              <SuggestionCard
                icon={Calculator}
                label="Formula Sheet"
                color="bg-blue-500/15 text-blue-400"
                isLoading={getFormulaSheet.isPending}
                data={formulas}
                onFetch={fetchFormulas}
              >
                {(d) => <FormulaContent formulas={d} />}
              </SuggestionCard>

              {/* Short Notes Card */}
              <SuggestionCard
                icon={FileText}
                label="Short Notes"
                color="bg-violet-500/15 text-violet-400"
                isLoading={getShortNotes.isPending}
                data={notes}
                onFetch={fetchNotes}
              >
                {(d) => <NotesContent notes={d} />}
              </SuggestionCard>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="w-4 h-4" />
          <p>Questions are generated focusing on previous year patterns</p>
        </div>
      </motion.div>
    </div>
  );
}
