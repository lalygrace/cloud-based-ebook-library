export type BookItem = {
  bookId: string;
  title: string;
  author: string;
  genre?: string;
  s3Key: string;
  contentType: string;
  originalFileName: string;
  uploadedAt: string;
};

export type UserRole = "user" | "admin";

export type UserItem = {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
};
