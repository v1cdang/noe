jest.mock('@/lib/supabase/serverClient', () => ({
  createSupabaseServerClient: jest.fn()
}));

// Route imports are intentionally done via require() so the jest mock above
// is applied before the modules load.
const todayPromptRoute = require('@/app/api/today-prompt/route') as typeof import('@/app/api/today-prompt/route');
const moodSubmitRoute = require('@/app/api/mood/submit/route') as typeof import('@/app/api/mood/submit/route');
const moodHistoryRoute = require('@/app/api/mood/history/route') as typeof import('@/app/api/mood/history/route');
const premiumUpgradeRoute = require('@/app/api/premium/upgrade/route') as typeof import('@/app/api/premium/upgrade/route');

const { createSupabaseServerClient } = require('@/lib/supabase/serverClient') as {
  createSupabaseServerClient: jest.Mock;
};

type SupabaseClientMock = {
  auth: {
    getUser: jest.Mock;
  };
};

const mockUnauthorizedSupabase = (): { supabase: SupabaseClientMock; applyCookieWrites: jest.Mock } => {
  return {
    supabase: {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null
        })
      }
    },
    applyCookieWrites: jest.fn()
  };
};

describe('API route smoke (unauthenticated)', () => {
  beforeEach(() => {
    (createSupabaseServerClient as jest.Mock).mockReset();
  });

  it('today-prompt returns 401 when unauthenticated', async () => {
    const mock = mockUnauthorizedSupabase();
    (createSupabaseServerClient as jest.Mock).mockResolvedValue(mock);

    const res = await todayPromptRoute.GET({} as any);
    expect(res.status).toBe(401);
  });

  it('mood/submit returns 401 when unauthenticated', async () => {
    const mock = mockUnauthorizedSupabase();
    (createSupabaseServerClient as jest.Mock).mockResolvedValue(mock);

    const req = {
      json: async () => ({ promptId: 'prompt-1', moodScore: 3 })
    };

    const res = await moodSubmitRoute.POST(req as any);
    expect(res.status).toBe(401);
  });

  it('mood/history returns 401 when unauthenticated', async () => {
    const mock = mockUnauthorizedSupabase();
    (createSupabaseServerClient as jest.Mock).mockResolvedValue(mock);

    const req = {
      url: 'http://localhost/api/mood/history?rangeDays=7'
    };

    const res = await moodHistoryRoute.GET(req as any);
    expect(res.status).toBe(401);
  });

  it('premium/upgrade returns 401 when unauthenticated', async () => {
    const mock = mockUnauthorizedSupabase();
    (createSupabaseServerClient as jest.Mock).mockResolvedValue(mock);

    const req = {} as any;
    const res = await premiumUpgradeRoute.POST(req);
    expect(res.status).toBe(401);
  });
});

