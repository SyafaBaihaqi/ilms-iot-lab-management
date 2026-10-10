import prisma from '../utils/prisma';
import { PROJECT_HIGHLIGHTS } from '../validators/project.validator';

const authorSelect = {
  id: true,
  fullName: true,
  username: true,
  nim: true,
  role: { select: { name: true } }
} as const;

export class ProjectService {
  static async getAll(filters: {
    search?: string;
    category?: string;
    highlight?: string;
    student?: string;
  }) {
    const where: any = { deletedAt: null };

    if (filters.highlight && (PROJECT_HIGHLIGHTS as readonly string[]).includes(filters.highlight)) {
      where.highlights = { has: filters.highlight };
    }
    if (filters.student === 'true') where.isStudentProject = true;
    if (filters.student === 'false') where.isStudentProject = false;
    if (filters.category) where.category = filters.category;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { authorName: { contains: filters.search, mode: 'insensitive' } },
        { techStack: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    return prisma.project.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: { author: { select: authorSelect }, createdBy: { select: authorSelect } }
    });
  }

  static async getById(id: string) {
    const project = await prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: { author: { select: authorSelect }, createdBy: { select: authorSelect } }
    });
    if (!project) {
      throw { statusCode: 404, message: 'Project not found', code: 'PROJECT_NOT_FOUND' };
    }
    return project;
  }

  /** Ringkasan jumlah total, featured, terpilih (star/trending), dan proyek mahasiswa. */
  static async getStats() {
    const [total, featured, student] = await Promise.all([
      prisma.project.count({ where: { deletedAt: null } }),
      prisma.project.count({ where: { deletedAt: null, highlights: { has: 'Featured' } } }),
      prisma.project.count({ where: { deletedAt: null, isStudentProject: true } })
    ]);
    return { total, featured, student };
  }

  static async create(
    data: {
      title: string;
      category: string;
      description: string;
      techStack?: string | null;
      repoUrl?: string | null;
      demoUrl?: string | null;
      imageUrl?: string | null;
      year?: string | null;
      tags?: string[];
      highlights?: string[];
      isStudentProject?: boolean;
      authorId?: string | null;
      authorName?: string;
      authorRole?: string;
      authorNim?: string;
    },
    createdById?: string
  ) {
    const { authorName, authorRole, authorNim } = await this.resolveAuthor(data);
    if (!authorName) {
      throw { statusCode: 400, message: 'Nama pembuat proyek wajib diisi', code: 'AUTHOR_REQUIRED' };
    }

    return prisma.project.create({
      data: {
        title: data.title,
        category: data.category,
        description: data.description,
        techStack: data.techStack || null,
        repoUrl: data.repoUrl || null,
        demoUrl: data.demoUrl || null,
        imageUrl: data.imageUrl || null,
        year: data.year || null,
        tags: data.tags || [],
        highlights: data.highlights || [],
        isStudentProject: data.isStudentProject ?? false,
        authorId: data.authorId || null,
        authorName,
        authorRole: authorRole || null,
        authorNim: authorNim || null,
        createdById: createdById || null
      },
      include: { author: { select: authorSelect }, createdBy: { select: authorSelect } }
    });
  }

  static async update(id: string, data: any) {
    await this.getById(id);
    return prisma.project.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.techStack !== undefined ? { techStack: data.techStack } : {}),
        ...(data.repoUrl !== undefined ? { repoUrl: data.repoUrl } : {}),
        ...(data.demoUrl !== undefined ? { demoUrl: data.demoUrl } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
        ...(data.year !== undefined ? { year: data.year } : {}),
        ...(data.tags !== undefined ? { tags: data.tags } : {}),
        ...(data.highlights !== undefined ? { highlights: data.highlights } : {}),
        ...(data.isStudentProject !== undefined ? { isStudentProject: data.isStudentProject } : {}),
        ...(data.authorName !== undefined ? { authorName: data.authorName } : {}),
        ...(data.authorRole !== undefined ? { authorRole: data.authorRole } : {}),
        ...(data.authorNim !== undefined ? { authorNim: data.authorNim } : {})
      },
      include: { author: { select: authorSelect }, createdBy: { select: authorSelect } }
    });
  }

  static async delete(id: string) {
    await this.getById(id);
    return prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  /** Ambil identitas penulis dari user terdaftar bila authorId dikirim. */
  static async resolveAuthor(data: { authorId?: string | null; authorName?: string; authorRole?: string; authorNim?: string }) {
    if (data.authorId) {
      const user = await prisma.user.findFirst({
        where: { id: data.authorId, deletedAt: null },
        include: { role: true }
      });
      if (user) {
        return { authorName: user.fullName, authorRole: user.role.name, authorNim: user.nim };
      }
    }
    return { authorName: data.authorName || '', authorRole: data.authorRole, authorNim: data.authorNim };
  }
}
