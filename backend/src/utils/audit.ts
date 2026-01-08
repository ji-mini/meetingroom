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
    const isUuid = Boolean(userId && /^[0-9a-fA-F-]{36}$/.test(userId));
    const finalDetails =
      userId && !isUuid
        ? { ...(details || {}), actorId: userId }
        : (details || {});

    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        // userId가 UUID 형식이 아니면(예: 사번) User 테이블에서 조회
        userId: isUuid ? userId : undefined,
        // userId가 UUID가 아닐 경우 details.actorId로 기록
        details: finalDetails,
        createdAt: kstTime,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to avoid breaking the main flow
  }
};
