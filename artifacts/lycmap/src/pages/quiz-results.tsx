import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetQuizSession, 
  useGetFormulaSheet, 
  useGetShortNotes 
} from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { 
  Loader2, Trophy, RotateCcw, Plus, Calculator, 
  FileText, BarChart3, ChevronRight 
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPercentage } from "@/lib/utils";

export default function QuizResults() {
  const { id } = useParams();
  const quizId = parseInt(id || "0", 10);

  const { data: session, isLoading } = useGetQuizSession(quizId, {
    query: { enabled: !!quizId }
  });

  const getFormulaSheet = useGetFormulaSheet();
  const getShortNotes = useGetShortNotes();

  const [formulas, setFormulas] = useState<any>(null);
  const [notes, setNotes] = useState<any>(null);

  useEffect(() => {
    if (session && session.status === "completed") {
      const chapterReq = {
        board: session.board,
        className: session.className,
        subject: session.subject,
        chapter: session.chapter
      };

      if (!formulas && !getFormulaSheet.isPending) {
        getFormulaSheet.mutate({ data: chapterReq }, {
          onSuccess: (data) => setFormulas(data)
        });
      }

      if (!notes && !getShortNotes.isPending) {
        getShortNotes.mutate({ data: chapterReq }, {
          onSuccess: (data) => setNotes(data)
        });
      }
    }
  }, [session]); // safe deps since formulas/notes checked

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 min-h-[80vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Calculating results...</p>
      </div>
    );
  }

  if (!session || session.status !== "completed") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
        <h2 className="text-xl font-bold mb-2">Quiz not complete</h2>
        <p className="text-muted-foreground mb-6">Finish the quiz first to see results.</p>
        <Link href={`/quiz/${quizId}`} className="inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 rounded-md transition-colors">
          Resume Quiz
        </Link>
      </div>
    );
  }

  const score = session.score || 0;
  const total = session.totalQuestions || session.questions.length;
  const percentage = total > 0 ? (score / total) * 100 : 0;
  
  // Create circular progress properties
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <div className="mb-8 text-center md:text-left flex flex-col md:flex-row items-center md:items-start gap-8">
        
        {/* Score Ring */}
        <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              className="text-secondary/50"
            />
            <motion.circle
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={circumference}
              strokeLinecap="round"
              className={percentage >= 75 ? "text-green-500" : percentage >= 40 ? "text-primary" : "text-destructive"}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold tracking-tighter">{score}</span>
            <span className="text-sm font-medium text-muted-foreground border-t border-border mt-1 pt-1 w-12 text-center">
              {total}
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className="inline-flex items-center justify-center md:justify-start gap-2 text-primary font-medium text-sm mb-2">
            <Trophy className="w-4 h-4" />
            <span>Session Complete</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight">{session.subject}</h1>
          <p className="text-xl text-muted-foreground mb-6">{session.chapter}</p>
          
          <div className="flex gap-3 justify-center md:justify-start">
            <Link href="/quiz" className="inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 rounded-full shadow-lg hover:shadow-primary/20 transition-all">
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake
            </Link>
            <Link href="/" className="inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-4 py-2 rounded-full transition-colors">
              <Plus className="w-4 h-4 mr-2" />
              New Quiz
            </Link>
          </div>
        </div>
      </div>

      <Tabs defaultValue="formulas" className="w-full">
        <TabsList className="w-full sm:w-auto flex sm:inline-flex bg-card border border-border/50 h-14 p-1 rounded-xl mb-6">
          <TabsTrigger value="formulas" className="flex-1 sm:w-40 rounded-lg h-full data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-none">
            <Calculator className="w-4 h-4 mr-2" />
            Formulas
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex-1 sm:w-40 rounded-lg h-full data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-none">
            <FileText className="w-4 h-4 mr-2" />
            Short Notes
          </TabsTrigger>
          <TabsTrigger value="pyq" className="flex-1 sm:w-40 rounded-lg h-full data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-none">
            <BarChart3 className="w-4 h-4 mr-2" />
            PYQ Graph
          </TabsTrigger>
        </TabsList>

        <div className="bg-card/40 border border-border/50 rounded-2xl min-h-[50vh] p-4 md:p-6 backdrop-blur">
          
          {/* FORMULAS TAB */}
          <TabsContent value="formulas" className="mt-0 outline-none">
            {getFormulaSheet.isPending ? (
              <div className="flex flex-col items-center py-20 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                <p>Curating AI formula sheet...</p>
              </div>
            ) : formulas ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {formulas.sections.map((section: any, i: number) => (
                  <div key={i} className="space-y-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <div className="w-2 h-6 bg-primary rounded-full" />
                      {section.sectionTitle}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {section.formulas.map((f: any, j: number) => (
                        <Card key={j} className="bg-background/50 border-border/50 hover:border-primary/30 transition-colors">
                          <CardContent className="p-5">
                            <div className="font-medium text-sm text-primary mb-2">{f.name}</div>
                            <div className="font-mono text-xl mb-3 tracking-tight bg-secondary/30 py-2 px-3 rounded-lg border border-border/50">
                              {f.formula}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
                              {f.description}
                            </p>
                            {f.unit && (
                              <div className="text-xs font-mono bg-accent/10 text-accent px-2 py-1 rounded inline-block">
                                Unit: {f.unit}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center text-muted-foreground">Failed to load formulas.</div>
            )}
          </TabsContent>

          {/* NOTES TAB */}
          <TabsContent value="notes" className="mt-0 outline-none">
            {getShortNotes.isPending ? (
              <div className="flex flex-col items-center py-20 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                <p>Generating short notes...</p>
              </div>
            ) : notes ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
                {notes.items.map((item: any, i: number) => (
                  <Card key={i} className="border-border/50 bg-background/30 overflow-hidden">
                    <CardHeader className="bg-secondary/20 pb-4">
                      <CardTitle className="text-xl text-primary">{item.heading}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <p className="text-foreground leading-relaxed mb-6">
                        {item.content}
                      </p>
                      <div className="space-y-2">
                        <div className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Key Points</div>
                        {item.keyPoints.map((kp: string, j: number) => (
                          <div key={j} className="flex gap-3 items-start">
                            <ChevronRight className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <span className="text-sm md:text-base">{kp}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center text-muted-foreground">Failed to load notes.</div>
            )}
          </TabsContent>

          {/* PYQ GRAPH TAB */}
          <TabsContent value="pyq" className="mt-0 outline-none">
            {getShortNotes.isPending ? (
              <div className="flex flex-col items-center py-20 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                <p>Loading historical data...</p>
              </div>
            ) : notes && notes.previousYearGraph ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-6">
                  <h3 className="text-xl font-bold">Previous Year Question Frequency</h3>
                  <p className="text-muted-foreground">Number of questions asked from this chapter over the years</p>
                </div>
                
                <div className="h-[400px] w-full bg-background/50 rounded-xl p-4 border border-border/50">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={notes.previousYearGraph} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis 
                        dataKey="year" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                      />
                      <Tooltip 
                        cursor={{ fill: 'var(--color-secondary)', opacity: 0.5 }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '0.5rem',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                        }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Bar 
                        dataKey="questionsCount" 
                        fill="hsl(var(--primary))" 
                        radius={[6, 6, 0, 0]} 
                        barSize={40}
                        name="Questions"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-muted-foreground">No historical data available.</div>
            )}
          </TabsContent>

        </div>
      </Tabs>
    </div>
  );
}
