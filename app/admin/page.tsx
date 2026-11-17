import { pool } from "@/lib/pool";
import { analyticsPool, ensureAnalyticsDb } from "@/lib/analytics";

interface SearchParams {
  key?: string;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (searchParams.key !== process.env.ADMIN_SECRET) {
    return (
      <div className="min-h-screen bg-gray-950 p-8">
        <div className="text-red-400 font-mono text-sm">
          401 Unauthorized — provide ?key= query param
        </div>
      </div>
    );
  }

  // Initialize analytics DB tables if needed
  try {
    await ensureAnalyticsDb();
  } catch {
    // ignore if analytics DB not configured
  }

  const keyDisplay = searchParams.key
    ? searchParams.key.slice(0, 4) + "****"
    : "";

  // ---- Fetch data from main DB ----
  let totalUsers = 0;
  let totalProjects = 0;
  let totalRuns = 0;
  let runStats = { total_runs: 0, completed: 0, failed: 0 };
  let userRows: Array<{ email: string; project_count: number; last_project: string | null; created_at: string }> = [];
  let newUsersLast7: Array<{ day: string; count: number }> = [];

  try {
    const [
      usersRes,
      projectsRes,
      runsRes,
      runStatsRes,
      userTableRes,
      newUsersRes,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) as count FROM users"),
      pool.query("SELECT COUNT(*) as count FROM projects"),
      pool.query("SELECT COUNT(*) as count FROM analysis_runs"),
      pool.query(`
        SELECT 
          COUNT(*) as total_runs,
          COUNT(CASE WHEN status='completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status='failed' THEN 1 END) as failed
        FROM analysis_runs
      `),
      pool.query(`
        SELECT u.email, COUNT(p.id) as project_count, MAX(p.created_at) as last_project, u.created_at
        FROM users u LEFT JOIN projects p ON p.user_id = u.id
        GROUP BY u.id, u.email, u.created_at ORDER BY project_count DESC
      `),
      pool.query(`
        SELECT DATE(created_at) as day, COUNT(*) as count
        FROM users WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY day ORDER BY day
      `),
    ]);

    totalUsers = parseInt(usersRes.rows[0].count);
    totalProjects = parseInt(projectsRes.rows[0].count);
    totalRuns = parseInt(runsRes.rows[0].count);
    runStats = {
      total_runs: parseInt(runStatsRes.rows[0].total_runs),
      completed: parseInt(runStatsRes.rows[0].completed),
      failed: parseInt(runStatsRes.rows[0].failed),
    };
    userRows = userTableRes.rows as typeof userRows;
    newUsersLast7 = newUsersRes.rows.map((r: { day: string; count: string }) => ({
      day: r.day,
      count: parseInt(r.count),
    }));
  } catch {
    // main DB error — continue with defaults
  }

  // ---- Fetch data from analytics DB ----
  let dauRows: Array<{ day: string; dau: number }> = [];
  let topEvents: Array<{ event: string; category: string; count: number }> = [];
  let tabPopularity: Array<{ tab: string; views: number }> = [];
  let featureAdoption: Array<{ event: string; unique_users: number; total: number }> = [];
  let pageViews: Array<{ path: string; views: number; sessions: number }> = [];
  let activeSessions = 0;
  let totalEvents30d = 0;

  try {
    const [
      dauRes,
      topEventsRes,
      tabRes,
      featureRes,
      pvRes,
      activeSessionsRes,
      events30dRes,
    ] = await Promise.all([
      analyticsPool.query(`
        SELECT DATE(ts) as day, COUNT(DISTINCT user_id) as dau
        FROM events WHERE ts > NOW() - INTERVAL '14 days' AND user_id IS NOT NULL
        GROUP BY day ORDER BY day
      `),
      analyticsPool.query(`
        SELECT event, category, COUNT(*) as count
        FROM events WHERE ts > NOW() - INTERVAL '30 days'
        GROUP BY event, category ORDER BY count DESC LIMIT 20
      `),
      analyticsPool.query(`
        SELECT properties->>'tab' as tab, COUNT(*) as views
        FROM events WHERE event = 'tab_viewed'
        GROUP BY tab ORDER BY views DESC
      `),
      analyticsPool.query(`
        SELECT event, COUNT(DISTINCT user_id) as unique_users, COUNT(*) as total
        FROM events WHERE category = 'feature'
        GROUP BY event ORDER BY unique_users DESC
      `),
      analyticsPool.query(`
        SELECT path, COUNT(*) as views, COUNT(DISTINCT session_id) as sessions
        FROM page_views WHERE ts > NOW() - INTERVAL '30 days'
        GROUP BY path ORDER BY views DESC LIMIT 15
      `),
      analyticsPool.query(`
        SELECT COUNT(*) as count FROM sessions WHERE last_seen_at > NOW() - INTERVAL '30 minutes'
      `),
      analyticsPool.query(`
        SELECT COUNT(*) as count FROM events WHERE ts > NOW() - INTERVAL '30 days'
      `),
    ]);

    dauRows = dauRes.rows.map((r: { day: string; dau: string }) => ({
      day: r.day,
      dau: parseInt(r.dau),
    }));
    topEvents = topEventsRes.rows.map((r: { event: string; category: string; count: string }) => ({
      event: r.event,
      category: r.category,
      count: parseInt(r.count),
    }));
    tabPopularity = tabRes.rows.map((r: { tab: string; views: string }) => ({
      tab: r.tab,
      views: parseInt(r.views),
    }));
    featureAdoption = featureRes.rows.map((r: { event: string; unique_users: string; total: string }) => ({
      event: r.event,
      unique_users: parseInt(r.unique_users),
      total: parseInt(r.total),
    }));
    pageViews = pvRes.rows.map((r: { path: string; views: string; sessions: string }) => ({
      path: r.path,
      views: parseInt(r.views),
      sessions: parseInt(r.sessions),
    }));
    activeSessions = parseInt(activeSessionsRes.rows[0].count);
    totalEvents30d = parseInt(events30dRes.rows[0].count);
  } catch {
    // analytics DB not configured or error — show zeros
  }

  const maxDau = dauRows.length > 0 ? Math.max(...dauRows.map((d) => d.dau)) : 1;

  const now = new Date().toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 font-mono">
      {/* Header */}
      <div className="mb-6 border-b border-gray-800 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-indigo-400">
              🔬 AEO Tracker — Admin Analytics
            </h1>
            <p className="text-xs text-gray-500 mt-1">{now} PST</p>
          </div>
          <div className="text-xs text-gray-600">
            Key: <span className="text-gray-400">{keyDisplay}</span>
          </div>
        </div>
      </div>

      {/* Row 1 — Summary Cards */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {[
          { label: "Total Users", value: totalUsers, color: "text-indigo-400" },
          { label: "Total Projects", value: totalProjects, color: "text-emerald-400" },
          { label: "Total Runs", value: `${runStats.completed}/${totalRuns}`, color: "text-blue-400" },
          { label: "Events (30d)", value: totalEvents30d, color: "text-purple-400" },
          { label: "Active Sessions (30m)", value: activeSessions, color: "text-yellow-400" },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-gray-900 border border-gray-800 rounded-lg p-4"
          >
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-xs text-gray-500 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {/* New Users (7d) */}
      {newUsersLast7.length > 0 && (
        <div className="mb-8 bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-3">
            New Users — Last 7 Days
          </h2>
          <table className="text-xs w-full">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left py-1 pr-4">Day</th>
                <th className="text-right py-1">Count</th>
              </tr>
            </thead>
            <tbody>
              {newUsersLast7.map((row) => (
                <tr key={row.day} className="border-b border-gray-800/50">
                  <td className="py-1 pr-4 text-gray-300">{row.day}</td>
                  <td className="py-1 text-right text-emerald-400">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Row 2 — DAU */}
      <div className="mb-8 bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h2 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-3">
          Daily Active Users — Last 14 Days
        </h2>
        {dauRows.length === 0 ? (
          <p className="text-xs text-gray-600">No data yet</p>
        ) : (
          <table className="text-xs w-full">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left py-1 pr-4">Day</th>
                <th className="text-right py-1 pr-4">DAU</th>
                <th className="text-left py-1">Bar</th>
              </tr>
            </thead>
            <tbody>
              {dauRows.map((row) => {
                const barLen = Math.round((row.dau / maxDau) * 30);
                return (
                  <tr key={row.day} className="border-b border-gray-800/50">
                    <td className="py-1 pr-4 text-gray-300">{row.day}</td>
                    <td className="py-1 pr-4 text-right text-indigo-400">{row.dau}</td>
                    <td className="py-1 text-indigo-500">{"█".repeat(barLen)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Row 3 — Two columns: Top Events + Tab Popularity */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-3">
            Top Events — Last 30 Days
          </h2>
          {topEvents.length === 0 ? (
            <p className="text-xs text-gray-600">No data yet</p>
          ) : (
            <table className="text-xs w-full">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left py-1 pr-3">Event</th>
                  <th className="text-left py-1 pr-3">Category</th>
                  <th className="text-right py-1">Count</th>
                </tr>
              </thead>
              <tbody>
                {topEvents.map((e, i) => (
                  <tr key={i} className="border-b border-gray-800/50">
                    <td className="py-1 pr-3 text-gray-200">{e.event}</td>
                    <td className="py-1 pr-3 text-gray-500">{e.category}</td>
                    <td className="py-1 text-right text-indigo-400">{e.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-3">
            Tab Popularity
          </h2>
          {tabPopularity.length === 0 ? (
            <p className="text-xs text-gray-600">No data yet</p>
          ) : (
            <table className="text-xs w-full">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left py-1 pr-4">Tab</th>
                  <th className="text-right py-1">Views</th>
                </tr>
              </thead>
              <tbody>
                {tabPopularity.map((t, i) => (
                  <tr key={i} className="border-b border-gray-800/50">
                    <td className="py-1 pr-4 text-gray-200">{t.tab}</td>
                    <td className="py-1 text-right text-purple-400">{t.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Row 4 — Feature Adoption */}
      <div className="mb-8 bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h2 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-3">
          Feature Adoption
        </h2>
        {featureAdoption.length === 0 ? (
          <p className="text-xs text-gray-600">No data yet</p>
        ) : (
          <table className="text-xs w-full">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left py-1 pr-4">Feature Event</th>
                <th className="text-right py-1 pr-4">Unique Users</th>
                <th className="text-right py-1">Total Uses</th>
              </tr>
            </thead>
            <tbody>
              {featureAdoption.map((f, i) => (
                <tr key={i} className="border-b border-gray-800/50">
                  <td className="py-1 pr-4 text-gray-200">{f.event}</td>
                  <td className="py-1 pr-4 text-right text-emerald-400">{f.unique_users}</td>
                  <td className="py-1 text-right text-blue-400">{f.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Row 5 — Users Table */}
      <div className="mb-8 bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h2 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-3">
          Users
        </h2>
        {userRows.length === 0 ? (
          <p className="text-xs text-gray-600">No users yet</p>
        ) : (
          <table className="text-xs w-full">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left py-1 pr-4">Email</th>
                <th className="text-right py-1 pr-4">Projects</th>
                <th className="text-right py-1 pr-4">Last Project</th>
                <th className="text-right py-1">Joined</th>
              </tr>
            </thead>
            <tbody>
              {userRows.map((u, i) => (
                <tr key={i} className="border-b border-gray-800/50">
                  <td className="py-1 pr-4 text-gray-200">{u.email}</td>
                  <td className="py-1 pr-4 text-right text-indigo-400">{u.project_count}</td>
                  <td className="py-1 pr-4 text-right text-gray-500">
                    {u.last_project
                      ? new Date(u.last_project).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="py-1 text-right text-gray-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Row 6 — Page Views */}
      <div className="mb-8 bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h2 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-3">
          Top Page Views — Last 30 Days
        </h2>
        {pageViews.length === 0 ? (
          <p className="text-xs text-gray-600">No data yet</p>
        ) : (
          <table className="text-xs w-full">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left py-1 pr-4">Path</th>
                <th className="text-right py-1 pr-4">Views</th>
                <th className="text-right py-1">Sessions</th>
              </tr>
            </thead>
            <tbody>
              {pageViews.map((pv, i) => (
                <tr key={i} className="border-b border-gray-800/50">
                  <td className="py-1 pr-4 text-gray-200">{pv.path}</td>
                  <td className="py-1 pr-4 text-right text-indigo-400">{pv.views}</td>
                  <td className="py-1 text-right text-purple-400">{pv.sessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Run Stats */}
      <div className="mb-8 bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h2 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-3">
          Analysis Run Stats
        </h2>
        <div className="flex gap-8 text-xs">
          <div>
            <span className="text-gray-500">Total: </span>
            <span className="text-gray-200">{runStats.total_runs}</span>
          </div>
          <div>
            <span className="text-gray-500">Completed: </span>
            <span className="text-emerald-400">{runStats.completed}</span>
          </div>
          <div>
            <span className="text-gray-500">Failed: </span>
            <span className="text-red-400">{runStats.failed}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
