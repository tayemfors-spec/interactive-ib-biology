import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  factsSchema,
  flashcardsSchema,
  quizSchema,
  topicFrontmatterSchema,
  visualsSchema,
} from './schemas';

// Each topic lives in its own folder, src/content/topics/<id>/ (id like "b2-1"),
// holding index.mdx plus quiz, flashcard, visual and fact files.
const base = './src/content/topics';
const generateId = ({ entry }: { entry: string }) => entry.split('/')[0]!;

export const collections = {
  topics: defineCollection({ loader: glob({ pattern: '*/index.mdx', base, generateId }), schema: topicFrontmatterSchema }),
  quizzes: defineCollection({ loader: glob({ pattern: '*/quiz.yaml', base, generateId }), schema: quizSchema }),
  flashcards: defineCollection({ loader: glob({ pattern: '*/flashcards.yaml', base, generateId }), schema: flashcardsSchema }),
  visuals: defineCollection({ loader: glob({ pattern: '*/visuals.yaml', base, generateId }), schema: visualsSchema }),
  facts: defineCollection({ loader: glob({ pattern: '*/facts.yaml', base, generateId }), schema: factsSchema }),
};
