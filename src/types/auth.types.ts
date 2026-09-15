import { IUser } from "./user.types";

export interface LoginPayload {
  email: string;
  password?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password?: string;
}

export interface AuthResponseData {
  user: IUser;
  accessToken: string;
}

export interface ChangePasswordPayload {
  oldPassword?: string;
  newPassword?: string;
}

