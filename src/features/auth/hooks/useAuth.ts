import { useAuthStore } from '../../../store/authStore';

// Hook trung gian cho auth feature.
// Khi implement auth thật, logic gọi authApi + lưu SecureStore sẽ nằm ở đây
// thay vì trực tiếp trong screen.
export function useAuth() {
  const { user, isAuthenticated, signIn, signOut } = useAuthStore();

  return {
    user,
    isAuthenticated,
    signIn,
    signOut,
    // TODO: thêm login(email, password), logout(), refreshToken() khi làm auth thật
  };
}
