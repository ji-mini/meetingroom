import prisma from '../config/database.js';

export async function getAuditLogs(params: {
  page: number;
  limit: number;
  action?: string;
  entity?: string;
  date?: string;
  userName?: string;
}) {
  const { page, limit, action, entity, date, userName } = params;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (action && action !== 'ALL') where.action = action;
  if (entity && entity !== 'ALL') where.entity = entity;
  if (userName) {
    where.user = {
      name: {
        contains: userName,
        mode: 'insensitive', // 대소문자 무시 (PostgreSQL)
      },
    };
  }
  if (date) {
    // 해당 날짜의 00:00:00 ~ 23:59:59 범위 조회
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    where.createdAt = {
      gte: startDate,
      lte: endDate,
    };
  }

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
