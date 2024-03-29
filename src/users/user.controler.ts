import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Request,
} from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from "@nestjs/swagger";
import { FastifyRequest } from "fastify";
import { ApiResponse } from "src/common/types";
import { Public } from "src/public.decorator";
import { CreateUserDto } from "./dto/user.dto";
import { UserListResponse, UserResponse } from "./user.entity";
import { UserService } from "./user.service";

@ApiSecurity("access-token")
@ApiTags("Users")
@Controller("users")
export class UserController {
  constructor(private readonly usersService: UserService) {}

  @Public()
  @ApiOperation({
    operationId: "user-register",
    description: "User register",
  })
  @ApiOkResponse({
    type: UserResponse,
  })
  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<ApiResponse> {
    const user = await this.usersService.create(createUserDto);
    const { id, email, username, fullname } = user;
    return new UserResponse(HttpStatus.CREATED, { id, email, username, fullname });
  }

  @ApiOperation({
    operationId: "list-users",
    description: "List users",
  })
  @ApiOkResponse({
    type: UserListResponse,
  })
  @Get()
  async findAll(@Request() request: FastifyRequest): Promise<UserListResponse> {
    const { user: requester }: Record<string, any> = request;
    const users = await this.usersService.findAll();
    // Remove requester from the list
    const userEntities = users
      .filter(({ id }) => id !== requester.id)
      .map(({ id, email, username, fullname }) => ({
        id,
        email,
        username,
        fullname,
      }));
    return new UserListResponse(HttpStatus.OK, userEntities);
  }

  @ApiOperation({
    operationId: "delete-user",
    description: "Delete register",
  })
  @Delete("/:email")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Request() request: FastifyRequest,
    @Param("email") email: string
  ): Promise<ApiResponse> {
    const { user: requester }: Record<string, any> = request;
    const userToDelete = await this.usersService.findOne({ email });
    if (!userToDelete) {
      throw new NotFoundException();
    }

    // Users cannot delete themselves
    if (userToDelete.id === requester.id) {
      throw new BadRequestException();
    }

    const { id, username, fullname } = await this.usersService.delete(userToDelete.email);
    return new UserResponse(HttpStatus.NO_CONTENT, { id, email, username, fullname });
  }
}
