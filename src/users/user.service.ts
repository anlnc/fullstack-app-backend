import { Injectable } from "@nestjs/common";
import { User } from "@prisma/client";
import * as bcrypt from "bcrypt";

import {
  ConflictError,
  DatabaseAccessError,
  MissingRequiredArgumentError,
  NotFoundError,
} from "src/common/types";
import { PrismaService } from "src/prisma.service";
import { CreateUserDto } from "./dto/user.dto";

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findOne({ email, username }: { email: string; username?: string }): Promise<User> {
    if (!email) {
      throw new MissingRequiredArgumentError("Email is required");
    }
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      });
      return user;
    } catch (error) {
      throw new DatabaseAccessError();
    }
  }

  async create(userInfo: CreateUserDto): Promise<User> {
    const { email, username, fullname, password } = userInfo ?? {};
    if (!email || !username || !fullname || !password) {
      throw new MissingRequiredArgumentError("Missing required argument");
    }
    try {
      const user = await this.findOne({ email, username });
      if (user) {
        throw new ConflictError(`User with email ${email} or username ${username} already exists`);
      }
      const hashedPassword = await bcrypt.hash(password, Number(process.env.SALT));
      const createdUser = await this.prisma.user.create({
        data: {
          email,
          username,
          fullname,
          password: hashedPassword,
        },
      });
      return createdUser;
    } catch (error) {
      if (error instanceof ConflictError) {
        throw error;
      }
      throw new DatabaseAccessError();
    }
  }

  async findAll(): Promise<User[]> {
    try {
      const users = await this.prisma.user.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });
      return users;
    } catch (error) {
      throw new DatabaseAccessError();
    }
  }

  async delete(email: string): Promise<User> {
    if (!email) {
      throw new MissingRequiredArgumentError(`User email is required`);
    }
    try {
      const userToDelete = await this.findOne({ email });
      if (!userToDelete) {
        throw new NotFoundError(`User with email ${email} not found`);
      }
      const deletedUser = await this.prisma.user.delete({ where: { email } });
      return deletedUser;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseAccessError();
    }
  }
}
