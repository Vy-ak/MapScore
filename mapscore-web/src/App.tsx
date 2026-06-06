import { useState, useEffect } from "react";

export default function App() {
  // STATE MANAGEMENT
  const [user, setUser] = useState<any>(null);
  const [myBusinesses, setMyBusinesses] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "checklist" | "leaderboard" | "profile" | "search"
  >("search");

  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [completedTaskIds, setCompletedTaskIds] = useState<number[]>([]);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);

  // LOGIKA API & AUTHENTICATION
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("userId");
    if (userId) {
      setUser({
        id: userId,
        name: params.get("name"),
        email: params.get("email"),
      });
      fetchMyBusinesses(userId);
      window.history.replaceState({}, "", "/");
    }
  }, []);

  const fetchMyBusinesses = async (uid: string) => {
    try {
      const res = await fetch(
        `http://localhost:3000/api/analyze/my-businesses?userId=${uid}`
      );
      const json = await res.json();
      if (json.success) {
        setMyBusinesses(json.businesses);
        if (json.businesses.length === 0) setActiveTab("search");
      }
    } catch (err) {
      console.error("Gagal menarik data profil", err);
    }
  };

  const handleSearch = async (e: any) => {
    e.preventDefault();
    setIsSearching(true);
    try {
      const res = await fetch("http://localhost:3000/api/analyze/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, location }),
      });
      const result = await res.json();
      setSearchResults(result.options || []);
    } catch (err) {
      alert("Gagal terhubung ke server.");
    } finally {
      setIsSearching(false);
    }
  };

  const fetchLiveCompetitors = async (
    bizName: string,
    bizLocation: string,
    userScore: number,
    userRating: number,
    userReviews: number
  ) => {
    try {
      const queryWord = bizName.split(" ").slice(0, 2).join(" ");
      const res = await fetch("http://localhost:3000/api/analyze/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: queryWord,
          location: bizLocation,
        }),
      });
      const result = await res.json();

      if (result.success && result.options && result.options.length > 1) {
        let comps = result.options.map((opt: any) => ({
          name: opt.name,
          rating: opt.rating || 0,
          reviews: opt.reviews || 0,
          score: Math.min(
            Math.round((opt.rating || 0) * 10 + (opt.reviews || 0) / 50),
            99
          ),
        }));

        if (!comps.some((c: any) => c.name === bizName)) {
          comps.pop();
          comps.push({
            name: bizName,
            score: userScore,
            rating: userRating,
            reviews: userReviews,
          });
        }

        comps.sort((a: any, b: any) => b.score - a.score);
        return comps.map((c: any, i: number) => ({ ...c, rank: i + 1 }));
      }
    } catch (err) {
      console.error("Gagal menarik kompetitor live", err);
    }
    return null;
  };

  const handleSelectBusiness = async (biz: any) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch("http://localhost:3000/api/analyze/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          businessName: biz.name,
          location: biz.location,
          competitorList: searchResults,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setDashboardData(result);
        setCompletedTaskIds([]);
        setActiveTab("dashboard");
        fetchMyBusinesses(user.id);
      }
    } catch (err) {
      alert("Gagal menganalisis profil bisnis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOpenDashboard = async (biz: any) => {
    setDashboardData({ business: biz, competitors: [] });
    setCompletedTaskIds([]);
    setExpandedTaskId(null);
    setActiveTab("dashboard");

    const liveComps = await fetchLiveCompetitors(
      biz.name,
      biz.location,
      biz.score,
      biz.rating || 0,
      biz.reviews || 0
    );

    if (liveComps) {
      setDashboardData({ business: biz, competitors: liveComps });
    } else {
      const baseScore = biz.score || 70;
      const baseRating = biz.rating || 0;
      const baseReviews = biz.reviews || 0;
      const mockComps = [
        {
          name: "Top Local Competitor",
          score: Math.min(baseScore + 12, 99),
          rating: 4.8,
          reviews: 150,
        },
        {
          name: "Nearby Similar Business",
          score: Math.min(baseScore + 5, 99),
          rating: 4.6,
          reviews: 90,
        },
        {
          name: biz.name,
          score: baseScore,
          rating: baseRating,
          reviews: baseReviews,
        },
        {
          name: "Average Local Shop",
          score: Math.max(baseScore - 8, 10),
          rating: 4.1,
          reviews: 40,
        },
        {
          name: "Newly Opened Store",
          score: Math.max(baseScore - 15, 5),
          rating: 5.0,
          reviews: 5,
        },
      ]
        .sort((a, b) => b.score - a.score)
        .map((c, i) => ({ ...c, rank: i + 1 }));

      setDashboardData({ business: biz, competitors: mockComps });
    }
  };

  const handleDeleteBusiness = async (bid: string) => {
    if (!confirm("Tindakan ini tidak bisa dibatalkan. Hapus bisnis ini?"))
      return;
    try {
      const res = await fetch(
        `http://localhost:3000/api/analyze/${bid}?userId=${user.id}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (json.success) {
        fetchMyBusinesses(user.id);
        if (dashboardData?.business?.id === bid) {
          setDashboardData(null);
          setActiveTab("profile");
        }
      }
    } catch (err) {
      alert("Gagal menghapus bisnis.");
    }
  };

  const toggleTask = (index: number) => {
    setCompletedTaskIds((prev) =>
      prev.includes(index)
        ? prev.filter((id) => id !== index)
        : [...prev, index]
    );
  };

  const generateShortTitle = (desc: string) => {
    const words = desc.split(" ");
    if (words.length <= 6) return desc;
    return words.slice(0, 6).join(" ") + "...";
  };

  // LAYAR LOGIN
  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#121416] relative overflow-hidden px-6 font-sans text-[#e2e2e5]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#e9c77e]/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-md bg-[#1E2124] border border-[#4d4639]/50 p-10 rounded-2xl shadow-2xl flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-[#e9c77e]/20 rounded-full flex items-center justify-center mb-6 border border-[#e9c77e]/30">
            <span className="material-symbols-outlined text-[#e9c77e] text-4xl">
              map
            </span>
          </div>

          <h1
            className="text-4xl font-bold mb-2 tracking-tight text-[#e9c77e]"
            style={{ fontFamily: "Hanken Grotesk, sans-serif" }}
          >
            MapScore
          </h1>
          <p className="text-[#d0c5b4] mb-10 text-sm">
            Premium Local Analytics
          </p>

          <div className="w-full space-y-4">
            <a
              href="http://localhost:3000/auth/google"
              className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                alt="Google"
                className="w-5 h-5"
              />
              Sign in with Google
            </a>

            <button
              onClick={() =>
                setUser({
                  id: "dev-user",
                  name: "Verdy Akbar",
                  email: "verdy@binus.ac.id",
                })
              }
              className="w-full flex items-center justify-center gap-2 bg-transparent border border-[#4d4639] text-[#d0c5b4] font-semibold py-3 px-6 rounded-lg hover:bg-[#333537] hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">
                code
              </span>
              Developer Login
            </button>
          </div>
        </div>
      </main>
    );
  }

  // LAYAR LOADING
  if (isAnalyzing)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#121416] text-[#e2e2e5]">
        <div className="relative w-20 h-20 mb-8">
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#e9c77e] border-r-[#e9c77e] animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#e9c77e] text-3xl animate-pulse">
              auto_awesome
            </span>
          </div>
        </div>
        <h3
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "Hanken Grotesk, sans-serif" }}
        >
          Processing Data...
        </h3>
        <p className="text-[#d0c5b4]">Compiling your local map snapshot.</p>
      </div>
    );

  // APLIKASI UTAMA
  return (
    <div
      className="bg-[#121416] text-[#e2e2e5] min-h-screen flex flex-col md:flex-row"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* --- SIDEBAR DESKTOP --- */}
      <nav className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-64 z-40 bg-[#1e2022] border-r border-[#4d4639]/30 shadow-lg transition-all duration-300 ease-in-out">
        <div className="p-8 border-b border-[#4d4639]/30 flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-full bg-[#e9c77e]/20 flex items-center justify-center text-[#e9c77e] font-bold text-xl"
            style={{ fontFamily: "Hanken Grotesk" }}
          >
            M
          </div>
          <div>
            <h1
              className="font-bold text-xl text-[#e9c77e]"
              style={{ fontFamily: "Hanken Grotesk" }}
            >
              MapScore
            </h1>
            <p className="text-[12px] font-medium text-[#d0c5b4]">
              Premium Analytics
            </p>
          </div>
        </div>
        <ul className="flex flex-col py-6 flex-grow gap-2 px-4">
          {["dashboard", "leaderboard", "checklist", "profile", "search"].map(
            (t: any) => {
              const isActive = activeTab === t;
              const labels: any = {
                dashboard: "Dashboard",
                leaderboard: "Leaderboard",
                checklist: "Checklist",
                profile: "Profile Hub",
                search: "Add Business",
              };
              const icons: any = {
                dashboard: "dashboard",
                leaderboard: "emoji_events",
                checklist: "task_alt",
                profile: "person",
                search: "add_circle",
              };
              return (
                <li key={t}>
                  <button
                    onClick={() => setActiveTab(t)}
                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg font-medium transition-all duration-200 
                    ${
                      isActive
                        ? "text-[#73d9b5] border-l-4 border-[#73d9b5] bg-[#73d9b5]/10"
                        : "text-[#d0c5b4] hover:bg-[#333537] hover:text-[#e2e2e5]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {icons[t]}
                    </span>
                    {labels[t]}
                  </button>
                </li>
              );
            }
          )}
        </ul>
        <div className="p-6 border-t border-[#4d4639]/30">
          <button
            onClick={() => {
              setUser(null);
              setDashboardData(null);
            }}
            className="w-full flex items-center gap-3 text-red-400 hover:text-red-300 font-medium px-4 py-2"
          >
            <span className="material-symbols-outlined text-[20px]">
              logout
            </span>{" "}
            Logout
          </button>
        </div>
      </nav>

      {/* --- KONTEN UTAMA --- */}
      <main className="flex-grow md:ml-64 flex flex-col pb-24 md:pb-0">
        {/* HEADER */}
        <header className="bg-[#1e2022] md:bg-transparent shadow-sm md:shadow-none sticky top-0 z-30 flex justify-between items-center w-full px-6 md:px-12 py-4 mx-auto border-b md:border-none border-[#4d4639]/30">
          <div className="md:hidden flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full bg-[#e9c77e]/20 flex items-center justify-center text-[#e9c77e] font-bold text-lg"
              style={{ fontFamily: "Hanken Grotesk" }}
            >
              M
            </div>
            <h1
              className="font-bold text-lg text-[#e9c77e]"
              style={{ fontFamily: "Hanken Grotesk" }}
            >
              MapScore
            </h1>
          </div>
          <div className="hidden md:block"></div>
          <div className="flex items-center gap-6">
            <button className="text-[#e9c77e] hover:text-[#73d9b5] transition-colors duration-200 cursor-pointer">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div
              onClick={() => setActiveTab("profile")}
              className="w-10 h-10 rounded-full border-2 border-[#4d4639] bg-gray-700 cursor-pointer flex items-center justify-center font-bold text-sm"
            >
              {user.name?.charAt(0)}
            </div>
          </div>
        </header>

        <div className="px-6 md:px-12 py-8 flex-grow">
          {/* TAB: SEARCH */}
          {activeTab === "search" && (
            <div className="max-w-3xl mx-auto flex flex-col justify-center min-h-[60vh] animate-in fade-in duration-500">
              <div className="text-center mb-10">
                <h2
                  className="text-4xl font-bold text-[#e2e2e5] mb-4"
                  style={{ fontFamily: "Hanken Grotesk" }}
                >
                  Find Your Business
                </h2>
                <p className="text-[#d0c5b4] max-w-lg mx-auto">
                  Search Google Maps to connect your business profile and unlock
                  your MapScore AI insights.
                </p>
              </div>

              <form
                onSubmit={handleSearch}
                className="flex flex-col md:flex-row gap-4 mb-8 bg-[#1E2124] p-5 rounded-xl border border-white/5 shadow-lg w-full"
              >
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#999080]">
                    store
                  </span>
                  <input
                    required
                    className="w-full bg-[#121416] border border-[#4d4639]/50 p-4 pl-12 rounded-lg text-[#e2e2e5] focus:outline-none focus:border-[#e9c77e] transition-colors"
                    placeholder="Business Name..."
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#999080]">
                    location_on
                  </span>
                  <input
                    required
                    className="w-full bg-[#121416] border border-[#4d4639]/50 p-4 pl-12 rounded-lg text-[#e2e2e5] focus:outline-none focus:border-[#e9c77e] transition-colors"
                    placeholder="City / Area..."
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <button
                  disabled={isSearching}
                  className="bg-[#e9c77e] text-[#251a00] font-bold px-10 py-4 rounded-lg hover:opacity-90 transition-opacity"
                >
                  {isSearching ? "Searching" : "Analyze"}
                </button>
              </form>

              <div className="space-y-4 w-full">
                {searchResults.map((b, i) => (
                  <div
                    key={i}
                    className="p-6 bg-[#1E2124] border border-[#4d4639]/50 rounded-xl flex justify-between items-center hover:border-[#e9c77e]/50 transition-colors shadow-sm"
                  >
                    <div>
                      <h4 className="font-bold text-xl mb-1 text-[#e2e2e5]">
                        {b.name}
                      </h4>
                      <p className="text-sm text-[#999080] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">
                          location_on
                        </span>{" "}
                        {b.location}
                      </p>
                    </div>
                    <button
                      onClick={() => handleSelectBusiness(b)}
                      className="bg-[#333537] hover:bg-[#e9c77e] hover:text-[#251a00] px-8 py-3 rounded-lg font-medium transition-colors border border-[#4d4639]/50"
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FALLBACK KOSONG */}
          {!dashboardData &&
            (activeTab === "dashboard" ||
              activeTab === "leaderboard" ||
              activeTab === "checklist") && (
              <div className="flex flex-col items-center justify-center mt-20 text-center animate-in fade-in duration-500">
                <span className="material-symbols-outlined text-[64px] text-[#4d4639] mb-4">
                  analytics
                </span>
                <h2
                  className="text-2xl font-bold text-[#e2e2e5] mb-2"
                  style={{ fontFamily: "Hanken Grotesk" }}
                >
                  No Active Dashboard
                </h2>
                <p className="text-[#d0c5b4] max-w-md">
                  Select a business from your Profile Hub or search for a new
                  one to view analytics.
                </p>
              </div>
            )}

          {/* TAB: DASHBOARD */}
          {activeTab === "dashboard" && dashboardData && (
            <div className="animate-in fade-in duration-500">
              <header className="mb-10">
                <h2
                  className="text-3xl md:text-4xl font-bold text-[#e2e2e5] mb-2"
                  style={{ fontFamily: "Hanken Grotesk" }}
                >
                  {dashboardData.business.name}
                </h2>
                <p className="text-[#d0c5b4] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">
                    location_on
                  </span>{" "}
                  {dashboardData.business.location}
                </p>
              </header>

              <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-[#1E2124] rounded-xl p-8 shadow-[0_12px_32px_rgba(0,0,0,0.4)] border border-white/5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <h2
                      className="font-bold text-lg text-[#e2e2e5]"
                      style={{ fontFamily: "Hanken Grotesk" }}
                    >
                      Your MapScore
                    </h2>
                    <span className="material-symbols-outlined text-[#73d9b5] opacity-80">
                      analytics
                    </span>
                  </div>
                  <div
                    className="text-5xl font-bold text-[#73d9b5] drop-shadow-[0_0_15px_rgba(115,217,181,0.4)]"
                    style={{ fontFamily: "Hanken Grotesk" }}
                  >
                    {dashboardData.business.scoreHistory[0]?.score || 0}
                  </div>
                </div>

                <div className="bg-[#1E2124] rounded-xl p-8 shadow-[0_12px_32px_rgba(0,0,0,0.4)] border border-white/5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <h2
                      className="font-bold text-lg text-[#e2e2e5]"
                      style={{ fontFamily: "Hanken Grotesk" }}
                    >
                      Current Rank
                    </h2>
                    <span className="material-symbols-outlined text-[#e9c77e] opacity-80">
                      emoji_events
                    </span>
                  </div>
                  <div
                    className="text-[36px] font-bold text-[#e2e2e5] leading-tight"
                    style={{ fontFamily: "Hanken Grotesk" }}
                  >
                    #{dashboardData.business.scoreHistory[0]?.rank || 1}
                  </div>
                </div>

                <div className="bg-[#1E2124] rounded-xl p-8 shadow-[0_12px_32px_rgba(0,0,0,0.4)] border border-white/5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <h2
                      className="font-bold text-lg text-[#e2e2e5]"
                      style={{ fontFamily: "Hanken Grotesk" }}
                    >
                      Total Reviews
                    </h2>
                    <span className="material-symbols-outlined text-[#999080] opacity-80">
                      reviews
                    </span>
                  </div>
                  <div
                    className="text-5xl font-bold text-[#e2e2e5]"
                    style={{ fontFamily: "Hanken Grotesk" }}
                  >
                    {dashboardData.business.totalReviews}
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="flex flex-col gap-4">
                  <h3
                    className="text-2xl font-bold text-[#e2e2e5]"
                    style={{ fontFamily: "Hanken Grotesk" }}
                  >
                    Local Snapshot
                  </h3>
                  <div className="bg-[#1E2124] rounded-xl overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.4)] border border-white/5 relative h-[400px] lg:h-[500px]">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay grayscale"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121416] via-transparent to-transparent"></div>

                    <div className="relative w-full h-full p-8">
                      <div className="absolute top-[20%] left-[30%] flex flex-col items-center">
                        <div className="w-4 h-4 rounded-full bg-[#4d4639]"></div>
                        <div className="w-[1px] h-6 bg-[#4d4639]"></div>
                      </div>
                      <div className="absolute top-[45%] right-[25%] flex flex-col items-center">
                        <div className="w-4 h-4 rounded-full bg-[#4d4639]"></div>
                        <div className="w-[1px] h-8 bg-[#4d4639]"></div>
                      </div>
                      <div className="absolute bottom-[35%] left-[40%] flex flex-col items-center">
                        <div className="w-4 h-4 rounded-full bg-[#4d4639]"></div>
                        <div className="w-[1px] h-4 bg-[#4d4639]"></div>
                      </div>

                      <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                        <div className="relative">
                          <div className="w-6 h-6 rounded-full bg-[#e9c77e] shadow-[0_0_20px_rgba(233,199,126,0.6)] z-10 relative flex items-center justify-center">
                            <div className="w-2 h-2 bg-[#3f2e00] rounded-full"></div>
                          </div>
                          <div className="absolute inset-0 rounded-full bg-[#e9c77e]/30 animate-ping"></div>
                        </div>
                        <div className="w-[2px] h-10 bg-gradient-to-b from-[#e9c77e] to-transparent"></div>
                        <div className="mt-2 bg-[#282a2c] px-3 py-1 rounded-full border border-white/10 text-[#e9c77e] text-[12px] font-medium backdrop-blur-sm max-w-[200px] truncate text-center">
                          {dashboardData.business.name}
                        </div>
                      </div>

                      <div className="absolute bottom-8 left-8">
                        <p className="text-[14px] font-semibold text-[#999080] tracking-widest uppercase">
                          Target Area
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[#73d9b5]">
                      auto_awesome
                    </span>
                    <h3
                      className="text-2xl font-bold text-[#e2e2e5]"
                      style={{ fontFamily: "Hanken Grotesk" }}
                    >
                      Top Recommendations
                    </h3>
                  </div>
                  <div className="flex flex-col gap-4">
                    {dashboardData.business.tasks
                      .slice(0, 3)
                      .map((task: any, idx: number) => (
                        <div
                          key={idx}
                          onClick={() => setActiveTab("checklist")}
                          className="bg-[#1E2124] rounded-xl p-6 shadow-[0_12px_32px_rgba(0,0,0,0.4)] border border-white/5 hover:border-[#73d9b5]/30 transition-colors duration-300 cursor-pointer group flex items-start gap-4"
                        >
                          <div className="w-10 h-10 rounded-full bg-[#73d9b5]/10 flex items-center justify-center flex-shrink-0 mt-1">
                            <span className="material-symbols-outlined text-[#73d9b5]">
                              bolt
                            </span>
                          </div>
                          <div>
                            <h4
                              className="text-[18px] font-medium text-[#e2e2e5] mb-2 group-hover:text-[#73d9b5] transition-colors"
                              style={{ fontFamily: "Hanken Grotesk" }}
                            >
                              {generateShortTitle(task.description)}
                            </h4>
                            <p className="text-[14px] text-[#d0c5b4]">
                              + {task.impactScore} MapScore Impact
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB: LEADERBOARD */}
          {activeTab === "leaderboard" && dashboardData && (
            <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
              <h2
                className="text-3xl font-bold text-[#e2e2e5] mb-2"
                style={{ fontFamily: "Hanken Grotesk" }}
              >
                Local Leaderboard
              </h2>
              <p className="text-[#d0c5b4] mb-8">
                Top 5 Competitors in your target location.
              </p>

              <div className="bg-[#1E2124] rounded-xl border border-white/5 overflow-hidden shadow-lg overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-[#121416]">
                    <tr>
                      <th className="p-6 text-[#999080] uppercase text-xs font-bold tracking-widest border-b border-white/5">
                        Rank
                      </th>
                      <th className="p-6 text-[#999080] uppercase text-xs font-bold tracking-widest border-b border-white/5">
                        Business Name
                      </th>
                      <th className="p-6 text-[#999080] uppercase text-xs font-bold tracking-widest border-b border-white/5">
                        Rating
                      </th>
                      <th className="p-6 text-center text-[#999080] uppercase text-xs font-bold tracking-widest border-b border-white/5">
                        Total Reviews
                      </th>
                      <th className="text-right p-6 text-[#999080] uppercase text-xs font-bold tracking-widest border-b border-white/5">
                        MapScore
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {dashboardData.competitors.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-16 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <span className="material-symbols-outlined text-[40px] text-[#e9c77e] animate-spin mb-4">
                              sync
                            </span>
                            <p className="text-[#d0c5b4] font-medium tracking-widest uppercase text-sm">
                              Pulling Live Map Data...
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      dashboardData.competitors.map((c: any, i: number) => {
                        const isUser = c.name === dashboardData.business.name;
                        return (
                          <tr
                            key={i}
                            className={`${
                              isUser
                                ? "bg-[#e9c77e]/5"
                                : "hover:bg-white/[0.02]"
                            } transition-colors`}
                          >
                            <td className="p-6 text-xl font-bold text-[#d0c5b4]">
                              {c.rank}
                            </td>
                            <td className="p-6">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`font-medium text-lg ${
                                    isUser ? "text-[#e9c77e]" : "text-[#e2e2e5]"
                                  }`}
                                >
                                  {c.name}
                                </span>
                                {isUser && (
                                  <span className="bg-[#e9c77e] text-[#251a00] text-[10px] font-bold px-2 py-1 rounded tracking-widest">
                                    YOU
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-6 text-lg font-bold text-[#e9c77e]">
                              {c.rating ? c.rating.toFixed(1) : "0.0"}{" "}
                              <span className="text-sm opacity-80">⭐</span>
                            </td>
                            <td className="p-6 text-center text-lg font-bold text-[#d0c5b4]">
                              {c.reviews || 0}
                            </td>
                            <td className="p-6 text-right text-xl font-bold text-[#e2e2e5]">
                              {c.score}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: CHECKLIST (DROPDOWN/ACCORDION) */}
          {activeTab === "checklist" && dashboardData && (
            <div className="max-w-3xl mx-auto animate-in fade-in duration-500">
              <h2
                className="text-3xl font-bold text-[#e2e2e5] mb-2"
                style={{ fontFamily: "Hanken Grotesk" }}
              >
                Task Checklist
              </h2>
              <p className="text-[#d0c5b4] mb-8">
                Execute these tasks to outrank your competitors.
              </p>

              <div className="space-y-4">
                {dashboardData.business.tasks.map((t: any, i: number) => {
                  const isCompleted = completedTaskIds.includes(i);
                  const isExpanded = expandedTaskId === i;
                  return (
                    <div
                      key={i}
                      className={`rounded-xl transition-all border overflow-hidden
                       ${
                         isCompleted
                           ? "bg-[#121416] border-white/5 opacity-60"
                           : "bg-[#1E2124] border-[#4d4639]/50 shadow-lg hover:border-[#73d9b5]/50"
                       }`}
                    >
                      <div
                        className="p-6 flex items-center justify-between cursor-pointer select-none"
                        onClick={() => setExpandedTaskId(isExpanded ? null : i)}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTask(i);
                            }}
                            className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer hover:bg-[#73d9b5]/20
                                 ${
                                   isCompleted
                                     ? "bg-[#73d9b5] border-[#73d9b5]"
                                     : "border-[#999080] bg-transparent"
                                 }`}
                          >
                            {isCompleted && (
                              <span className="material-symbols-outlined text-[#003829] text-[16px] font-bold">
                                check
                              </span>
                            )}
                          </div>
                          <div>
                            <p
                              className={`font-medium text-lg ${
                                isCompleted
                                  ? "text-[#999080] line-through"
                                  : "text-[#e2e2e5]"
                              }`}
                            >
                              {generateShortTitle(t.description)}
                            </p>
                            <p className="text-[12px] font-medium text-[#73d9b5] tracking-widest uppercase mt-1">
                              Impact: {t.impactScore}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`material-symbols-outlined text-[#999080] transition-transform duration-300 ${
                            isExpanded ? "rotate-180" : "rotate-0"
                          }`}
                        >
                          expand_more
                        </span>
                      </div>

                      {isExpanded && !isCompleted && (
                        <div className="px-6 pb-6 pt-2 pl-16 border-t border-white/5 text-[#d0c5b4] text-sm leading-relaxed bg-[#16181A] animate-in slide-in-from-top-2 duration-300">
                          <div className="flex items-start gap-2">
                            <span className="material-symbols-outlined text-[#e9c77e] text-[18px]">
                              lightbulb
                            </span>
                            <p>{t.description}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: PROFILE HUB */}
          {activeTab === "profile" && (
            <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
              <h2
                className="text-3xl font-bold text-[#e2e2e5] mb-2"
                style={{ fontFamily: "Hanken Grotesk" }}
              >
                Profile Hub
              </h2>
              <p className="text-[#d0c5b4] mb-8">
                Manage all your local business properties.
              </p>

              {myBusinesses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-[#1E2124] border border-dashed border-[#4d4639] rounded-xl text-center shadow-sm">
                  <span className="material-symbols-outlined text-[64px] text-[#4d4639] mb-4">
                    storefront
                  </span>
                  <h3
                    className="text-2xl font-bold text-[#e2e2e5] mb-2"
                    style={{ fontFamily: "Hanken Grotesk" }}
                  >
                    You haven't registered your business yet
                  </h3>
                  <p className="text-[#d0c5b4] mb-8 max-w-md">
                    Add your business to start tracking your local SEO
                    performance and get AI-driven insights.
                  </p>
                  <button
                    onClick={() => setActiveTab("search")}
                    className="bg-[#e9c77e] text-[#251a00] font-bold px-8 py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      add_circle
                    </span>
                    Register a Business
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myBusinesses.map((b) => (
                    <div
                      key={b.id}
                      className="bg-[#1E2124] p-8 rounded-xl border border-[#4d4639]/50 shadow-lg relative group hover:border-[#e9c77e]/40 transition-colors"
                    >
                      <button
                        onClick={() => handleDeleteBusiness(b.id)}
                        className="absolute top-6 right-6 text-[#999080] hover:text-[#ffb4ab] transition-colors"
                      >
                        <span className="material-symbols-outlined">
                          delete
                        </span>
                      </button>
                      <h4
                        className="text-2xl font-bold text-[#e2e2e5] mb-1 pr-10"
                        style={{ fontFamily: "Hanken Grotesk" }}
                      >
                        {b.name}
                      </h4>
                      <p className="text-[#999080] text-sm mb-8 truncate">
                        {b.location}
                      </p>

                      <div className="flex justify-between items-end border-t border-white/5 pt-6">
                        <div>
                          <p className="text-[12px] font-bold text-[#999080] uppercase tracking-widest mb-1">
                            Score
                          </p>
                          <p
                            className="text-4xl font-bold text-[#e9c77e]"
                            style={{ fontFamily: "Hanken Grotesk" }}
                          >
                            {b.scoreHistory[0]?.score || 0}
                          </p>
                        </div>
                        <button
                          onClick={() => handleOpenDashboard(b)}
                          className="bg-[#333537] hover:bg-[#e2e2e5] hover:text-[#121416] px-6 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            open_in_new
                          </span>
                          Dashboard
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* --- MOBILE BOTTOM NAV --- */}
      <nav className="md:hidden fixed bottom-0 w-full bg-[#1e2022] border-t border-[#4d4639]/30 px-6 py-3 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <ul className="flex justify-between items-center w-full">
          {["dashboard", "search", "profile"].map((t: any) => {
            const labels: any = {
              dashboard: "Dashboard",
              search: "Add",
              profile: "Profile",
            };
            const icons: any = {
              dashboard: "dashboard",
              search: "add_circle",
              profile: "person",
            };
            const isActive = activeTab === t;
            return (
              <li key={t}>
                <button
                  onClick={() => setActiveTab(t)}
                  className={`flex flex-col items-center gap-1 ${
                    isActive
                      ? "text-[#73d9b5]"
                      : "text-[#d0c5b4] hover:text-[#e2e2e5]"
                  }`}
                >
                  <span className="material-symbols-outlined">{icons[t]}</span>
                  <span className="text-[10px] font-medium">{labels[t]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
