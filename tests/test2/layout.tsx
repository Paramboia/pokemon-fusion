export default function TestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ 
      background: 'linear-gradient(to bottom, #4338ca, #000000)',
      minHeight: '100vh',
      width: '100%'
    }}>
      {children}
    </div>
  );
} 