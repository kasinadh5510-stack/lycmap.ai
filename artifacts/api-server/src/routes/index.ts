import { Router, type IRouter } from "express";
import healthRouter from "./health";
import quizRouter from "./quiz";
import openaiRouter from "./openai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(quizRouter);
router.use(openaiRouter);

export default router;
