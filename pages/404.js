import Link from 'next/link';

export default function Custom404() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-xl mb-8">Sorry, the page you are looking for does not exist.</p>
      
      <div className="p-4 bg-yellow-100 rounded-lg border border-yellow-300 mb-8">
        <p className="text-yellow-700">
          This is a custom 404 page from the Pages Router.
        </p>
      </div>
      
      <Link href="/" className="text-blue-500 hover:underline">
        Go back to home
      </Link>
    </div>
  );
} 