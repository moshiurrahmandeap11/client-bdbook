import { IUser } from "./user.interface";
import { IPost } from "./post.interface";

export interface ISearchResult {
  users: IUser[];
  posts?: IPost[];
}

