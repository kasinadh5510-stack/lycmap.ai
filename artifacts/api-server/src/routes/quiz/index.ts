import { Router, type IRouter } from "express";
import { db, quizSessions, quizQuestions } from "@workspace/db";
import {
  GenerateQuizBody,
  GetQuizSessionParams,
  CompleteQuizSessionParams,
  CompleteQuizSessionBody,
  GetFormulaSheetBody,
  GetShortNotesBody,
  UploadDocumentBody,
} from "@workspace/api-zod";
import { eq, desc } from "drizzle-orm";
import { ai, GEMINI_MODEL } from "../../lib/geminiClient";

const router: IRouter = Router();

async function generateText(prompt: string, maxTokens = 8192): Promise<string> {
  const response = await ai.chat.completions.create({
    model: GEMINI_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return response.choices[0]?.message?.content ?? "";
}

// POST /quiz/generate
router.post("/quiz/generate", async (req, res): Promise<void> => {
  const parsed = GenerateQuizBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { board, className, subject, chapter, level, questionCount = 20 } = parsed.data;

  const prompt = `You are an expert teacher for Indian school curriculum.
Generate exactly ${questionCount} multiple choice questions for:
- Board: ${board}
- Class: ${className}
- Subject: ${subject}
- Chapter: ${chapter}
- Difficulty: ${level}

Rules:
1. Include a mix of CBSE previous year questions (mark them with type "previous_year" and include the year like "2019", "2020", "2022", "2023" etc.) and AI-generated questions (type "ai_generated").
2. For at least 8 questions, use CBSE previous year questions from 2015-2024.
3. Write ALL equations as plain readable text (e.g., "F = ma", "E = mc^2", "v^2 = u^2 + 2as") — NEVER use LaTeX, dollar signs, or special math symbols.
4. Each question has exactly 4 options (A, B, C, D). The correctAnswer must be exactly one of the option strings.
5. Provide a clear explanation for each answer.
6. Topics should cover the most important concepts of the chapter.

Respond with a JSON array only (no markdown, no code fences):
[
  {
    "questionText": "...",
    "options": ["option A text", "option B text", "option C text", "option D text"],
    "correctAnswer": "option A text",
    "explanation": "...",
    "type": "previous_year" or "ai_generated",
    "year": "2022" or null,
    "topic": "topic name",
    "difficulty": "easy" or "medium" or "hard"
  }
]`;

  let questionsData: Array<{
    questionText: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    type: string;
    year: string | null;
    topic: string;
    difficulty: string;
  }>;

  try {
    const content = await generateText(prompt, 8192);
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    questionsData = JSON.parse(cleaned);
  } catch (err) {
    req.log.error({ err }, "Failed to generate quiz from Gemini");
    res.status(500).json({ error: "Failed to generate quiz questions" });
    return;
  }

  // Create session
  const [session] = await db
    .insert(quizSessions)
    .values({
      board,
      className,
      subject,
      chapter,
      level,
      status: "in_progress",
      totalQuestions: questionsData.length,
    })
    .returning();

  // Insert questions
  const insertedQuestions = await db
    .insert(quizQuestions)
    .values(
      questionsData.map((q) => ({
        sessionId: session.id,
        questionText: q.questionText,
        options: JSON.stringify(q.options),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        type: q.type ?? "ai_generated",
        year: q.year ?? null,
        topic: q.topic ?? "",
        difficulty: q.difficulty ?? "medium",
      }))
    )
    .returning();

  res.json({
    ...session,
    questions: insertedQuestions.map((q) => ({
      ...q,
      options: JSON.parse(q.options as string),
    })),
  });
});

// GET /quiz/sessions
router.get("/quiz/sessions", async (_req, res): Promise<void> => {
  const sessions = await db
    .select()
    .from(quizSessions)
    .orderBy(desc(quizSessions.createdAt))
    .limit(50);
  res.json(sessions);
});

// GET /quiz/sessions/:id
router.get("/quiz/sessions/:id", async (req, res): Promise<void> => {
  const params = GetQuizSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .select()
    .from(quizSessions)
    .where(eq(quizSessions.id, params.data.id));

  if (!session) {
    res.status(404).json({ error: "Quiz session not found" });
    return;
  }

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.sessionId, params.data.id));

  res.json({
    ...session,
    questions: questions.map((q) => ({
      ...q,
      options: JSON.parse(q.options as string),
    })),
  });
});

// POST /quiz/sessions/:id/complete
router.post("/quiz/sessions/:id/complete", async (req, res): Promise<void> => {
  const params = CompleteQuizSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = CompleteQuizSessionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [updated] = await db
    .update(quizSessions)
    .set({
      status: "completed",
      score: body.data.score,
      completedAt: new Date(),
    })
    .where(eq(quizSessions.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Quiz session not found" });
    return;
  }

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.sessionId, params.data.id));

  res.json({
    ...updated,
    questions: questions.map((q) => ({
      ...q,
      options: JSON.parse(q.options as string),
    })),
  });
});

// GET /quiz/stats
router.get("/quiz/stats", async (_req, res): Promise<void> => {
  const sessions = await db.select().from(quizSessions);
  const totalSessions = sessions.length;
  const totalQuestions = sessions.reduce((sum, s) => sum + s.totalQuestions, 0);
  const completedSessions = sessions.filter((s) => s.status === "completed" && s.score !== null);
  const averageScore = completedSessions.length > 0
    ? completedSessions.reduce((sum, s) => sum + (s.score! / s.totalQuestions) * 100, 0) / completedSessions.length
    : 0;

  const questions = await db.select().from(quizQuestions);
  const topicMap: Record<string, { count: number; subject: string; chapter: string }> = {};
  for (const q of questions) {
    const session = sessions.find((s) => s.id === q.sessionId);
    if (!topicMap[q.topic]) {
      topicMap[q.topic] = { count: 0, subject: session?.subject ?? "", chapter: session?.chapter ?? "" };
    }
    topicMap[q.topic].count++;
  }

  const topicFrequency = Object.entries(topicMap)
    .map(([topic, data]) => ({ topic, count: data.count, subject: data.subject, chapter: data.chapter }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const subjectMap: Record<string, { count: number; scores: number[] }> = {};
  for (const s of sessions) {
    if (!subjectMap[s.subject]) subjectMap[s.subject] = { count: 0, scores: [] };
    subjectMap[s.subject].count++;
    if (s.score !== null) subjectMap[s.subject].scores.push((s.score / s.totalQuestions) * 100);
  }
  const subjectBreakdown = Object.entries(subjectMap).map(([subject, data]) => ({
    subject,
    count: data.count,
    averageScore: data.scores.length > 0 ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : 0,
  }));

  res.json({ totalSessions, totalQuestions, averageScore, topicFrequency, subjectBreakdown });
});

// POST /quiz/formula-sheet
router.post("/quiz/formula-sheet", async (req, res): Promise<void> => {
  const parsed = GetFormulaSheetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { board, className, subject, chapter } = parsed.data;

  const prompt = `You are an expert teacher for ${board} Class ${className} ${subject}.
Create a comprehensive formula sheet for the chapter: "${chapter}".

Write ALL equations as plain readable text (e.g., "F = ma", "E = mc^2", "KE = (1/2)mv^2").
NEVER use LaTeX, dollar signs, special symbols like #, ^, or any math notation.

Also list 5-8 topics from this chapter that frequently appear in CBSE previous year board exams.

Respond with JSON only (no markdown):
{
  "subject": "${subject}",
  "chapter": "${chapter}",
  "sections": [
    {
      "sectionTitle": "section name",
      "formulas": [
        {
          "name": "Formula Name",
          "formula": "plain text equation",
          "description": "what it represents",
          "unit": "SI unit",
          "derivation": "brief derivation if important or null"
        }
      ]
    }
  ],
  "previousYearTopics": ["topic1", "topic2"]
}`;

  try {
    const content = await generateText(prompt, 4096);
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(cleaned));
  } catch (err) {
    req.log.error({ err }, "Failed to generate formula sheet");
    res.status(500).json({ error: "Failed to generate formula sheet" });
  }
});

// POST /quiz/short-notes
router.post("/quiz/short-notes", async (req, res): Promise<void> => {
  const parsed = GetShortNotesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { board, className, subject, chapter } = parsed.data;

  const prompt = `You are an expert teacher for ${board} Class ${className} ${subject}.
Create comprehensive short notes for the chapter: "${chapter}".

Write ALL equations as plain readable text (e.g., "F = ma", "v = u + at").
NEVER use LaTeX, dollar signs, or special math symbols.

Base the notes on what is most frequently asked in CBSE/ICSE previous year board exams (2015-2024).
Also provide a graph dataset showing how many questions from this chapter appeared in each board exam year.

Respond with JSON only (no markdown):
{
  "subject": "${subject}",
  "chapter": "${chapter}",
  "items": [
    {
      "heading": "concept heading",
      "content": "explanation (2-3 sentences)",
      "keyPoints": ["point 1", "point 2"],
      "equations": ["plain text equation 1"],
      "previousYearRelevance": "why this is important for exams or null"
    }
  ],
  "previousYearGraph": [
    {
      "year": "2019",
      "questionsCount": 3,
      "topics": ["topic1", "topic2"]
    }
  ]
}`;

  try {
    const content = await generateText(prompt, 4096);
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(cleaned));
  } catch (err) {
    req.log.error({ err }, "Failed to generate short notes");
    res.status(500).json({ error: "Failed to generate short notes" });
  }
});

// POST /quiz/upload
router.post("/quiz/upload", async (req, res): Promise<void> => {
  const parsed = UploadDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { fileName, fileData, mimeType } = parsed.data;

  try {
    let content: string;

    if (mimeType.startsWith("image/")) {
      const response = await ai.chat.completions.create({
        model: GEMINI_MODEL,
        max_tokens: 2048,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Analyze this study material image and extract content for quiz generation. Write equations as plain text. Respond with JSON only: {\"extractedText\": \"summary\", \"detectedSubject\": \"subject or null\", \"detectedChapter\": \"chapter or null\", \"suggestedQuestions\": [\"question?\"]}" },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${fileData}` } },
          ],
        }],
      });
      content = response.choices[0]?.message?.content ?? "{}";
    } else {
      const prompt = `Analyze this uploaded study material (file: ${fileName}).
Extract the text content and identify the subject and chapter.
Also suggest 3-5 quiz questions based on the content.

Respond with JSON only:
{
  "extractedText": "summary of the document content",
  "detectedSubject": "subject name or null",
  "detectedChapter": "chapter name or null",
  "suggestedQuestions": ["question 1?", "question 2?"]
}`;
      content = await generateText(prompt, 2048);
    }

    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(cleaned));
  } catch (err) {
    req.log.error({ err }, "Failed to analyze document");
    res.status(500).json({ error: "Failed to analyze document" });
  }
});

export default router;
