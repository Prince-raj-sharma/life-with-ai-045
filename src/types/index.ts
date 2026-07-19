export type UserRole = 'admin' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  mobile?: string;
  photoURL?: string;
  role: UserRole;
  createdAt: string;
  lastLogin?: string;
  emailVerified: boolean;
  blocked?: boolean;
  purchasedCourses: string[]; // Course IDs
  wishlist: string[];
  bookmarks: string[];
}

export interface Course {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  categoryId: string;
  categoryName: string;
  language: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  price: number;
  discount: number; // percentage e.g. 20
  thumbnailUrl: string;
  bannerUrl: string;
  promoVideoUrl?: string;
  pdfUrls: string[];
  requirements: string[];
  learningOutcomes: string[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  totalStudents?: number;
  averageRating?: number;
  totalReviews?: number;
}

export interface Category {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  createdAt: string;
}

export interface Lesson {
  id?: string;
  courseId: string;
  moduleTitle: string;
  title: string;
  description?: string;
  videoUrl: string;
  pdfUrl?: string;
  durationMinutes: number;
  order: number;
  isFreePreview?: boolean;
  createdAt: string;
}

export type CourseItemType = "video" | "pdf" | "image";

export interface CourseFolder {
  id?: string;
  courseId: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt?: string;
  parentFolderId?: string;
  parentId?: string | null;
  path?: string;
  depth?: number;
  source?: "manual" | "google-drive";
  sourceDriveFolderId?: string;
}

export interface CourseItem {
  id?: string;
  courseId: string;
  folderId: string;
  type: CourseItemType;
  title: string;
  url?: string;
  videoUrl?: string;
  pdfUrl?: string;
  imageUrl?: string;
  thumbnail?: string;
  duration: number;
  size?: number;
  order: number;
  createdAt: string;
  updatedAt?: string;
  description?: string;
  isFreePreview?: boolean;
  storageKey?: string;
  thumbnailStorageKey?: string;
  mimeType?: string;
  name?: string;
  folderPath?: string;
  parentFolder?: string;
  r2Key?: string;
  r2Url?: string;
  driveCreatedAt?: string;
  source?: "r2" | "legacy" | "google-drive";
  sourceDriveFileId?: string;
}

export interface CourseContentResponse {
  folders: CourseFolder[];
  items: CourseItem[];
}

export interface Order {
  id?: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  userId: string;
  userEmail: string;
  userName: string;
  courseId: string;
  courseTitle: string;
  amount: number;
  currency: string;
  status: 'created' | 'paid' | 'failed';
  createdAt: string;
  invoiceNumber: string;
}

export interface Payment {
  id?: string;
  orderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  userId: string;
  courseId: string;
  amount: number;
  status: 'success' | 'refunded' | 'failed';
  createdAt: string;
}

export interface Review {
  id?: string;
  courseId: string;
  userId: string;
  userName: string;
  userImage?: string;
  rating: number; // 1-5
  comment: string;
  status: 'approved' | 'pending';
  createdAt: string;
}

export interface CourseProgress {
  id?: string;
  userId: string;
  courseId: string;
  completedLessonIds: string[];
  lastAccessedLessonId?: string;
  updatedAt: string;
}

export interface Certificate {
  id?: string;
  certificateNumber: string;
  userId: string;
  userName: string;
  courseId: string;
  courseTitle: string;
  issueDate: string;
  pdfUrl?: string;
}

export interface Notification {
  id?: string;
  userId: string; // 'all' or specific userId
  title: string;
  message: string;
  type: 'announcement' | 'order' | 'course' | 'system';
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export interface Announcement {
  id?: string;
  title: string;
  content: string;
  target: 'all' | 'students';
  createdBy: string;
  createdAt: string;
}

export interface ContactMessage {
  id?: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  status: 'unread' | 'read';
}
