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
