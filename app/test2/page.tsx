export default function TestPage() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      color: 'white',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Test Page 2</h1>
      <p style={{ fontSize: '1.25rem' }}>This is a completely standalone page with inline styles.</p>
      <p style={{ fontSize: '1rem', marginTop: '1rem' }}>If you can see this, the application is working!</p>
    </div>
  );
} 