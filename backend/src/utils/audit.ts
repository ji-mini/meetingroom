import prisma from '../config/database.js';

export const logAction = async (
  action: string,
  entity: string,
  entityId: string,
  details: any,
  userId?: string
) => {
  try {
    // KST Time (Fake UTC)
    // Current time + 9 hours
    const now = new Date();
    const kstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);

    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        details: details || {},
        // userId가 UUID 형식이 아니면(예: 사번) User 테이블에서 조회
        userId: userId && /^[0-9a-fA-F-]{36}$/.test(userId) ? userId : undefined,
        // userId가 UUID가 아닐 경우 details에 기록
        details: userId && !/^[0-9a-fA-F-]{36}$/.test(userId) 
          ? { ...(details || {}), actorId: userId } 
          : (details || {}),
        createdAt: kstTime,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to avoid breaking the main flow
  }
};
