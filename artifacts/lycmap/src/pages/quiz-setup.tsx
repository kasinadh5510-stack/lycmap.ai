import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Settings2, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { useGenerateQuiz } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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

export default function QuizSetup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const generateQuiz = useGenerateQuiz();

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

  const onSubmit = (values: z.infer<typeof setupSchema>) => {
    generateQuiz.mutate({ data: values }, {
      onSuccess: (session) => {
        toast({
          title: "Quiz Generated!",
          description: "Your personalized study session is ready.",
        });
        setLocation(`/quiz/${session.id}`);
      },
      onError: (err: any) => {
        toast({
          title: "Failed to generate quiz",
          description: err?.error || "Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full min-h-[calc(100vh-theme(spacing.16))] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full"
      >
        <Card className="border-border/50 bg-card/60 backdrop-blur overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
          
          <CardHeader className="text-center pb-8 pt-10">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <Settings2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">Configure Session</CardTitle>
            <CardDescription className="text-base mt-2">
              Set up your AI-generated quiz tailored to your syllabus
            </CardDescription>
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
                            <SelectItem value="12">Class 12</SelectItem>
                            <SelectItem value="11">Class 11</SelectItem>
                            <SelectItem value="10">Class 10</SelectItem>
                            <SelectItem value="9">Class 9</SelectItem>
                            <SelectItem value="8">Class 8</SelectItem>
                            <SelectItem value="7">Class 7</SelectItem>
                            <SelectItem value="6">Class 6</SelectItem>
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

                <div className="pt-6">
                  <Button 
                    type="submit" 
                    className="w-full h-14 text-lg font-bold rounded-xl relative overflow-hidden group"
                    disabled={generateQuiz.isPending}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[length:200%_100%] animate-in" style={{ animation: "bg-pan 3s linear infinite" }} />
                    <span className="relative flex items-center justify-center gap-2">
                      {generateQuiz.isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Curating your quiz...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          Generate Smart Quiz
                        </>
                      )}
                    </span>
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="w-4 h-4" />
          <p>Questions are generated focusing on previous year patterns</p>
        </div>
      </motion.div>
    </div>
  );
}
