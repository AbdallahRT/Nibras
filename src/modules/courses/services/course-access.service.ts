import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { AuthenticatedUser } from '@modules/auth/types/authenticated-user.type';
import { CourseRole } from '../enums/course.enums';
import { Course, CourseDocument } from '../schemas/course.schema';
import {
  CourseMembership,
  CourseMembershipDocument,
} from '../schemas/course-membership.schema';

const MANAGER_ROLES = new Set<CourseRole>([
  CourseRole.Instructor,
  CourseRole.Ta,
]);

@Injectable()
export class CourseAccessService {
  constructor(
    @InjectModel(Course.name) private readonly courseModel: Model<Course>,
    @InjectModel(CourseMembership.name)
    private readonly membershipModel: Model<CourseMembership>,
  ) {}

  isPlatformAdmin(user: AuthenticatedUser): boolean {
    return user.role === 'admin' || user.role === 'super-admin';
  }

  hasInstructorPlatformRole(user: AuthenticatedUser): boolean {
    return (
      this.isPlatformAdmin(user) ||
      user.role === 'instructor' ||
      user.permissions.includes('courses:write')
    );
  }

  async getMembership(
    userId: string,
    courseId: string,
  ): Promise<CourseMembershipDocument | null> {
    if (!Types.ObjectId.isValid(courseId)) return null;
    return this.membershipModel
      .findOne({
        courseId: new Types.ObjectId(courseId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
  }

  canViewCourse(
    user: AuthenticatedUser,
    membership: CourseMembershipDocument | null,
  ): boolean {
    if (this.isPlatformAdmin(user)) return true;
    return membership !== null;
  }

  canManageCourse(
    user: AuthenticatedUser,
    membership: CourseMembershipDocument | null,
  ): boolean {
    if (this.isPlatformAdmin(user)) return true;
    return membership !== null && MANAGER_ROLES.has(membership.role);
  }

  async ensurePublicCourseStudentAccess(
    userId: string,
    course: CourseDocument,
  ): Promise<CourseMembershipDocument | null> {
    if (!course.isPublic || course.deletedAt) return null;
    const existing = await this.getMembership(userId, course._id.toString());
    if (existing) return existing;
    return this.membershipModel.create({
      courseId: course._id,
      userId: new Types.ObjectId(userId),
      role: CourseRole.Student,
      level: 1,
    });
  }

  async canViewCourseForRequest(
    user: AuthenticatedUser,
    courseId: string,
  ): Promise<boolean> {
    const course = await this.findActiveCourse(courseId);
    if (!course) return false;
    let membership = await this.getMembership(user.id, courseId);
    if (!membership && course.isPublic) {
      membership = await this.ensurePublicCourseStudentAccess(user.id, course);
    }
    return this.canViewCourse(user, membership);
  }

  async canManageCourseForRequest(
    user: AuthenticatedUser,
    courseId: string,
  ): Promise<boolean> {
    const membership = await this.getMembership(user.id, courseId);
    return this.canManageCourse(user, membership);
  }

  async findActiveCourse(courseId: string): Promise<CourseDocument | null> {
    if (!Types.ObjectId.isValid(courseId)) return null;
    return this.courseModel
      .findOne({ _id: courseId, deletedAt: null, isActive: true })
      .exec();
  }
}
