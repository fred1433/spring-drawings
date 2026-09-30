// Serves site/dist at https://theaipipe.com/vanel-springs/ . Static files only.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/vanel-springs') return Response.redirect(`${url.origin}/vanel-springs/`, 301);
    const path = url.pathname.replace(/^\/vanel-springs/, '') || '/';
    const res = await env.ASSETS.fetch(new Request(new URL(path, url.origin), request));
    const out = new Response(res.body, res);
    out.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return out;
  },
};
