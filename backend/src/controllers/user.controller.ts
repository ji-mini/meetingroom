import type { Request, Response } from 'express';
import * as userService from '../services/user.service.js';
import type { AuthenticatedUser } from '../types/user.js';

/**
 * 사용자 목록 조회 (관리자만)
 */
export async function getUsers(req: Request, res: Response) {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({
      message: '사용자 목록 조회 중 오류가 발생했습니다.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * 사용자 권한 업데이트 (관리자만)
 */
export async function updateUserRole(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || (role !== 'ADMIN' && role !== 'USER')) {
      return res.status(400).json({
        message: '유효한 권한(ADMIN 또는 USER)을 입력해주세요.',
      });
    }

    const user = await userService.updateUserRole(id, role);
    const departmentName = (user as any).department?.name || null;
    
    res.json({
        ...user,
        departmentName: departmentName
    });
  } catch (error) {
    const statusCode = error instanceof Error && error.message.includes('존재하지') ? 404 : 400;
    res.status(statusCode).json({
      message: error instanceof Error ? error.message : '사용자 권한 업데이트 중 오류가 발생했습니다.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}












