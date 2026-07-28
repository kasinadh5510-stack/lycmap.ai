import { useListQuizSessions } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Sparkles, BookOpen, Brain, Clock, ChevronRight } from "lucide-react";
import { cn, formatFraction, formatPercentage } from "@/lib/utils";
import { motion } from "framer-motion";
import logoImg from "@assets/ChatGPT_Image_Jul_19,_2026,_07_31_55_PM_1785165664193.png";

export default function Home() {
  const { data: sessions, isLoading } = useListQuizSessions();

  return (
    <div className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
      <section className="relative py-12 md:py-20 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10"
        >
          <div className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            <span>CBSE | ICSE | SCERT</span>
          </div>
          
          <img 
            src={logoImg} 
            alt="lycmap.ai Logo" 
            className="w-24 h-24 md:w-32 md:h-32 mx-auto rounded-2xl shadow-2xl shadow-primary/20 mb-6" 
          />
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            Your <span className="text-gradient-electric">AI Study Partner</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Generate personalized quizzes, get instant feedback, and access AI-curated formula sheets and notes tailored for your syllabus.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/quiz" className={cn(
              "inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "w-full sm:w-auto text-lg h-14 px-8 rounded-full shadow-[0_0_40px_-10px_rgba(220,38,38,0.5)] hover:shadow-[0_0_60px_-15px_rgba(220,38,38,0.7)] transition-all"
            )}>
              <Play className="mr-2 w-5 h-5 fill-current" />
              Start Quiz Session
            </Link>
            <Link href="/chat" className={cn(
              "inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
              "border border-input hover:bg-accent hover:text-accent-foreground",
              "w-full sm:w-auto text-lg h-14 px-8 rounded-full border-border/50 bg-background/50 backdrop-blur"
            )}>
              <Brain className="mr-2 w-5 h-5" />
              Talk to AI Tutor
            </Link>
          </div>
        </motion.div>
        
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      </section>

      <section className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            Recent Sessions
          </h2>
          <Link href="/stats">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="bg-card/40 border-border/50">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))
          ) : sessions && sessions.length > 0 ? (
            sessions.slice(0, 6).map((session, i) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Card className="bg-card/40 border-border/50 hover:bg-card/60 transition-colors h-full flex flex-col group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                        {session.board} • Class {session.className}
                      </div>
                      {session.status === "completed" && session.score != null ? (
                        <div className="text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                          {formatPercentage(session.score, session.totalQuestions)}
                        </div>
                      ) : (
                        <div className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded">
                          In Progress
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
                      {session.subject}
                    </CardTitle>
                    <CardDescription className="line-clamp-1">
                      {session.chapter}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto pt-4 flex gap-2">
                    <Link href={session.status === "completed" ? `/quiz/${session.id}/results` : `/quiz/${session.id}`} className={cn(
                      "inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                      "text-secondary-foreground h-9 px-4 py-2 w-full rounded-md bg-secondary/50 hover:bg-secondary transition-colors"
                    )}>
                      {session.status === "completed" ? "View Results" : "Continue"}
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center border border-dashed rounded-xl border-border/50 bg-card/20">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No active sessions</h3>
              <p className="text-muted-foreground mb-4">Start a new quiz to test your knowledge.</p>
              <Link href="/quiz" className={cn(
                "inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                "bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 rounded-md transition-colors"
              )}>
                Create Quiz
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
