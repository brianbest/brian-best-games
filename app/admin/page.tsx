import { isAuthenticated } from "@/lib/auth";
import LoginForm from "@/components/admin/LoginForm";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default async function AdminPage() {
  const authenticated = await isAuthenticated();

  return (
    <div className="min-h-screen bg-[#0f0f13]">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Admin <span className="text-[#6c63ff]">Panel</span>
            </h1>
            <p className="text-[#6b7280] mt-1">Manage your game queue</p>
          </div>
          <a
            href="/"
            className="text-[#6b7280] hover:text-white text-sm transition-colors"
          >
            ← Back to site
          </a>
        </div>

        {authenticated ? <AdminDashboard /> : <LoginForm />}
      </div>
    </div>
  );
}
