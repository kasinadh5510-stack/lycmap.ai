import { useState, useMemo, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useGetQuizSession, useCompleteQuizSession } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function QuizActive() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const quizId = parseInt(id || "0", 10);

  const { data: session, isLoading, error } = useGetQuizSession(quizId, {
    query: { enabled: !!quizId }
  });

  const completeQuiz = useCompleteQuizSession();

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse questions from session
  const questions = useMemo(() => session?.questions || [], [session]);
  
  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === questions.length && questions.length > 0;
  const progress = questions.length ? (answeredCount / questions.length) * 100 : 0;

  const handleSelectOption = (questionId: number, option: string) => {
    if (answers[questionId]) return; // prevent changing answer
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleFinish = () => {
    if (!isComplete) return;
    
    // Calculate score
    let score = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) score++;
    });

    setIsSubmitting(true);
    completeQuiz.mutate({ id: quizId, data: { score } }, {
      onSuccess: () => {
        toast({ title: "Quiz Completed!", description: `You scored ${score}/${questions.length}` });
        setLocation(`/quiz/${quizId}/results`);
      },
      onError: () => {
        toast({ title: "Error saving result", variant: "destructive" });
        setIsSubmitting(false);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 min-h-[80vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Loading your quiz session...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <X className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold mb-2">Quiz not found</h2>
        <p className="text-muted-foreground mb-6">This session may have been deleted or doesn't exist.</p>
        <Button onClick={() => setLocation("/quiz")}>Create New Quiz</Button>
      </div>
    );
  }

  // Already completed?
  if (session.status === "completed") {
    setLocation(`/quiz/${quizId}/results`);
    return null;
  }

  return (
    <div className="flex-1 pb-32">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 py-4 px-4 shadow-sm">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-2">
            <h1 className="font-bold text-lg hidden sm:block">
              {session.subject}: {session.chapter}
            </h1>
            <span className="text-sm font-medium text-muted-foreground font-mono">
              {answeredCount} / {questions.length} Answered
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 py-8 space-y-8">
        {questions.map((q, index) => {
          const userAnswer = answers[q.id];
          const isAnswered = !!userAnswer;
          const isCorrect = userAnswer === q.correctAnswer;
          
          return (
            <Card 
              key={q.id} 
              className={cn(
                "border transition-all duration-300 relative overflow-hidden",
                isAnswered ? (isCorrect ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5") : "border-border/50 hover:border-primary/30"
              )}
            >
              {isAnswered && (
                <div className="absolute top-0 left-0 w-1 h-full" />
              )}
              
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="w-8 h-8 shrink-0 rounded-full bg-secondary flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 space-y-6">
                    <div className="font-medium text-lg leading-relaxed whitespace-pre-wrap">
                      {q.questionText}
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {q.options.map((opt, i) => {
                        const isSelected = userAnswer === opt;
                        const isOptionCorrect = opt === q.correctAnswer;
                        
                        let optionState = "default";
                        if (isAnswered) {
                          if (isOptionCorrect) optionState = "correct";
                          else if (isSelected) optionState = "wrong";
                          else optionState = "disabled";
                        }

                        return (
                          <button
                            key={i}
                            disabled={isAnswered}
                            onClick={() => handleSelectOption(q.id, opt)}
                            className={cn(
                              "relative w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3 overflow-hidden",
                              optionState === "default" && "border-border/50 hover:border-primary/50 hover:bg-primary/5",
                              optionState === "correct" && "border-green-500 bg-green-500/10 text-green-500",
                              optionState === "wrong" && "border-destructive bg-destructive/10 text-destructive",
                              optionState === "disabled" && "border-border/20 opacity-50 cursor-not-allowed"
                            )}
                          >
                            {/* Animated Background for correct/wrong state */}
                            {isSelected && (
                              <motion.div 
                                layoutId={`bg-${q.id}`}
                                className={cn(
                                  "absolute inset-0 opacity-10",
                                  isCorrect ? "bg-green-500" : "bg-destructive"
                                )}
                                initial={false}
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                              />
                            )}

                            <div className={cn(
                              "w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors",
                              optionState === "default" && "border-muted-foreground/30",
                              optionState === "correct" && "border-green-500 bg-green-500 text-white",
                              optionState === "wrong" && "border-destructive bg-destructive text-white",
                              optionState === "disabled" && "border-muted-foreground/20"
                            )}>
                              {String.fromCharCode(65 + i)}
                            </div>
                            
                            <span className="flex-1 font-medium">{opt}</span>

                            <AnimatePresence>
                              {optionState === "correct" && isAnswered && (
                                <motion.div
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className="text-green-500"
                                >
                                  <Check className="w-5 h-5" />
                                </motion.div>
                              )}
                              {optionState === "wrong" && isSelected && (
                                <motion.div
                                  initial={{ x: -10, opacity: 0 }}
                                  animate={{ x: [0, -5, 5, -5, 5, 0], opacity: 1 }}
                                  transition={{ duration: 0.4 }}
                                  className="text-destructive"
                                >
                                  <X className="w-5 h-5" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>
                        );
                      })}
                    </div>

                    <AnimatePresence>
                      {isAnswered && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, marginTop: 0 }}
                          animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                          className="bg-card rounded-lg p-4 border border-border/50 text-sm overflow-hidden"
                        >
                          <div className="font-semibold mb-1 text-primary">Explanation:</div>
                          <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{q.explanation}</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="sticky bottom-8 z-50 pt-8"
            >
              <div className="bg-card/80 backdrop-blur-xl border border-border shadow-2xl rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">Quiz Complete!</h3>
                  <p className="text-muted-foreground">Ready to see your detailed breakdown?</p>
                </div>
                <Button 
                  size="lg" 
                  onClick={handleFinish}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto h-14 px-8 text-lg rounded-xl shadow-[0_0_30px_-5px_rgba(220,38,38,0.4)] hover:shadow-[0_0_40px_-5px_rgba(220,38,38,0.6)]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <>
                      View Results
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
