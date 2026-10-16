export const dynamic = "force-static";

// No agent resources are published. Avoid the streamed HTML not-found page's 200 status.
export const GET = () => new Response(null, { status: 404 });
