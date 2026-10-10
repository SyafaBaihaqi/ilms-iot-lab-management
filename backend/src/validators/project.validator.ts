import { z } from 'zod';

/** Label proyek terpilih. */
export const PROJECT_HIGHLIGHTS = ['Featured', 'Star', 'Trending'] as const;
export type ProjectHighlight = (typeof PROJECT_HIGHLIGHTS)[number];

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

export const createProjectSchema = z.object({
  title: z.string().trim().min(3, 'Judul minimal 3 karakter').max(150),
  category: z.string().trim().min(2, 'Kategori wajib diisi').max(50),
  description: z.string().trim().min(10, 'Deskripsi minimal 10 karakter'),
  techStack: optionalText(255),
  repoUrl: optionalText(255),
  demoUrl: optionalText(255),
  imageUrl: optionalText(255),
  year: optionalText(10),
  tags: z.array(z.string().trim().max(50)).optional(),
  highlights: z.array(z.enum(PROJECT_HIGHLIGHTS)).optional(),
  isStudentProject: z.boolean().optional(),
  authorId: z.string().uuid().nullable().optional(),
  authorName: z.string().trim().max(100).optional().or(z.literal('')),
  authorRole: z.string().trim().max(50).optional().or(z.literal('')),
  authorNim: z.string().trim().max(20).optional().or(z.literal(''))
});

export const updateProjectSchema = z.object({
  title: z.string().trim().max(150).optional(),
  category: z.string().trim().max(50).optional(),
  description: z.string().trim().optional(),
  techStack: optionalText(255),
  repoUrl: optionalText(255),
  demoUrl: optionalText(255),
  imageUrl: optionalText(255),
  year: optionalText(10),
  tags: z.array(z.string().trim().max(50)).optional(),
  highlights: z.array(z.enum(PROJECT_HIGHLIGHTS)).optional(),
  isStudentProject: z.boolean().optional(),
  authorId: z.string().uuid().nullable().optional(),
  authorName: z.string().trim().max(100).optional(),
  authorRole: z.string().trim().max(50).optional(),
  authorNim: z.string().trim().max(20).optional()
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
