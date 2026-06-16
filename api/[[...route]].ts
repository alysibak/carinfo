type ExpressApp = (req: any, res: any) => void;

let app: ExpressApp | null = null;

export default async function handler(req: any, res: any) {
  if (!app) {
    // Dynamic import avoids ESM/CJS load-order crashes in the Vercel bundle.
    const mod = await import('../server/dist/app.js');
    app = mod.default as ExpressApp;
  }
  return app(req, res);
}
