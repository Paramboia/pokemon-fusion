// Mock implementation for build
export async function sendNotification({
  userId,
  title,
  message,
  url,
}: {
  userId: string
  title: string
  message: string
  url?: string
}) {
  console.log('Mock notification:', { userId, title, message, url });
  return { success: true };
} 