export const ENV = {
  API_URL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000',
  SIGNALR_URL: process.env.EXPO_PUBLIC_SIGNALR_URL ?? 'http://localhost:5000/hubs',
  APP_ENV: (process.env.EXPO_PUBLIC_APP_ENV ?? 'development') as 'development' | 'staging' | 'production',
  CLOUDINARY_CLOUD_NAME: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '',
  CLOUDINARY_UPLOAD_PRESET: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '',
} as const;

export const isDev = ENV.APP_ENV === 'development';
