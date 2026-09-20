import { IUser } from "./user.interface";

export interface ILoginPayload {
  email: string;
  password?: string;
  idToken?: string; // For Google sign-in
}

export interface ISignupPayload {
  fullName?: string;
  name?: string;
  email: string;
  password?: string;
  username?: string;
  idToken?: string; // For Google sign-up
}

export interface IAuthResponse {
  user: IUser;
  accessToken?: string;
  refreshToken?: string;
}

export type AuthResponseData = IAuthResponse;
export type LoginPayload = ILoginPayload;
export type RegisterPayload = ISignupPayload;

export interface ChangePasswordPayload {
  oldPassword?: string;
  currentPassword?: string;
  newPassword: string;
}

