import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[70vh] px-4 py-16">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-8">Page Not Found</h2>
      <p className="text-gray-400 text-center max-w-md mb-8">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Button asChild>
        <Link href="/">
          Return Home
        </Link>
      </Button>
    </div>
  );
} 