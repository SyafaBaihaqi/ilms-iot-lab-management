import prisma from '../utils/prisma';

export class CategoryService {
  static async getAll() {
    return prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { components: { where: { deletedAt: null } } }
        }
      }
    });
  }

  static async getById(id: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        components: {
          where: { deletedAt: null }
        }
      }
    });

    if (!category) {
      throw { statusCode: 404, message: 'Category not found', code: 'CATEGORY_NOT_FOUND' };
    }

    return category;
  }

  static async create(data: { name: string; description?: string }) {
    const existing = await prisma.category.findUnique({
      where: { name: data.name }
    });

    if (existing) {
      throw { statusCode: 409, message: 'Category with this name already exists', code: 'DUPLICATE_CATEGORY' };
    }

    return prisma.category.create({ data });
  }

  static async update(id: string, data: { name?: string; description?: string }) {
    await this.getById(id);
    return prisma.category.update({
      where: { id },
      data
    });
  }

  static async delete(id: string) {
    const count = await prisma.component.count({
      where: { categoryId: id, deletedAt: null }
    });

    if (count > 0) {
      throw {
        statusCode: 400,
        message: 'Cannot delete category that still has active components',
        code: 'CATEGORY_NOT_EMPTY'
      };
    }

    return prisma.category.delete({ where: { id } });
  }
}
