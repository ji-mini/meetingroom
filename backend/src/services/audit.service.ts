import prisma from '../config/database.js';

export async function getAuditLogs(params: {
  page: number;
  limit: number;
  action?: string;
  entity?: string;
}) {
  const { page, limit, action, entity } = params;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (action && action !== 'ALL') where.action = action;
  if (entity && entity !== 'ALL') where.entity = entity;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            department: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map(log => ({
      ...log,
      user: log.user ? {
        ...log.user,
        departmentName: log.user.department?.name,
      } : null,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}
