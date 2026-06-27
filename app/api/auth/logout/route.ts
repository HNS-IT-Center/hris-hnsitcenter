import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const html = `
    <html>
      <body>
        <script>
          try {
            const bc = new BroadcastChannel('sso_auth_sync');
            bc.postMessage('session_updated');
            bc.close();
          } catch (e) {}
          window.location.href = '/login';
        </script>
      </body>
    </html>
  `;
  
  const response = new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });

  // Use response headers directly because Next.js cookieStore overwrites cookies with the same name!
  // This guarantees BOTH the local and live domain cookies are destroyed simultaneously.
  response.headers.append('Set-Cookie', 'sso_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly');
  response.headers.append('Set-Cookie', 'sso_token=; Path=/; Domain=.hnsitcenter.id; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly');

  return response;
}
