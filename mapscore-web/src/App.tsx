import { useState, useEffect } from "react";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [myBusinesses, setMyBusinesses] = useState<any[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "checklist" | "leaderboard" | "profile" | "search"
  >("search");

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [businessName, setBusinessName] = useState("");
  const [location, setLocation] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [completedTaskIds, setCompletedTaskIds] = useState<number[]>([]);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [chartTimeRange, setChartTimeRange] = useState<
    "day" | "week" | "month"
  >("month");

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
    if (
      !confirm(
        "Are you sure you want to delete this business? This action cannot be undone."
      )
    )
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
      alert("Failed to delete business.");
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
    if (!desc) return "Tugas Baru";
    const words = desc.split(" ");
    if (words.length <= 6) return desc;
    return words.slice(0, 6).join(" ") + "...";
  };

  let matrix: any[] = [];
  let dynamicTasks: any[] = [];
  let totalScore = 0;

  if (dashboardData && dashboardData.business) {
    const biz = dashboardData.business;
    totalScore = biz.scoreHistory?.[0]?.score || 0;
    const rating = biz.rating || biz.avgRating || 0;
    const reviews = biz.reviews || biz.totalReviews || 0;

    let s1 = Math.min(Math.round((rating / 5) * 40), 40);
    let s2 = Math.min(Math.round((reviews / 150) * 30), 30);
    let s3 = 15;
    let s4 = totalScore - (s1 + s2 + s3);

    if (s4 < 0) {
      s3 += s4;
      s4 = 0;
      if (s3 < 0) {
        s2 += s3;
        s3 = 0;
      }
    }
    if (s4 > 15) {
      const excess = s4 - 15;
      s4 = 15;
      s3 = Math.min(s3 + excess, 15);
    }

    matrix = [
      {
        id: 1,
        name: "Kualitas Ulasan (Rating Bintang)",
        score: s1,
        max: 40,
        task: "Tingkatkan rata-rata rating dengan meminta pelanggan yang puas untuk memberikan ulasan bintang 5.",
      },
      {
        id: 2,
        name: "Kuantitas Ulasan (Jumlah Review)",
        score: s2,
        max: 30,
        task: "Buat program promo khusus untuk pelanggan yang mau meninggalkan ulasan di Google Maps hari ini.",
      },
      {
        id: 3,
        name: "Kelengkapan Profil (Foto & Info)",
        score: s3,
        max: 15,
        task: "Unggah 3 foto produk/suasana terbaru dan pastikan jam operasional serta nomor telepon sudah akurat.",
      },
      {
        id: 4,
        name: "Responsivitas & Aktivitas",
        score: s4,
        max: 15,
        task: "Luangkan waktu 10 menit untuk membalas ulasan pelanggan (baik positif maupun negatif) yang belum terjawab minggu ini.",
      },
    ];

    dynamicTasks = matrix
      .filter((m) => m.score < m.max)
      .map((m) => ({
        description: m.task,
        impactScore: m.max - m.score,
        aspect: m.name,
      }))
      .sort((a, b) => b.impactScore - a.impactScore);

    if (dynamicTasks.length === 0) {
      dynamicTasks.push({
        description:
          "Pertahankan performa luar biasa Anda dengan rutin memonitor profil secara berkala.",
        impactScore: 1,
        aspect: "Pemeliharaan Performa",
      });
    }
  }

  const getTopBusiness = () => {
    if (myBusinesses.length === 0) return null;
    return [...myBusinesses].sort(
      (a, b) =>
        (b.scoreHistory?.[0]?.score || 0) - (a.scoreHistory?.[0]?.score || 0)
    )[0];
  };
  const getChartData = () => {
    if (chartTimeRange === "day") return [40, 42, 45, 45, 50, 52, 55];
    if (chartTimeRange === "week") return [30, 45, 52, 55];
    return [20, 25, 30, 35, 42, 45, 48, 50, 52, 55, 60, 65];
  };
  const getChartLabels = () => {
    if (chartTimeRange === "day")
      return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    if (chartTimeRange === "week") return ["Wk1", "Wk2", "Wk3", "Wk4"];
    return [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
  };

  if (!user) {
    return (
      <main className="min-h-screen flex flex-col relative bg-slate-900 font-sans text-slate-100">
        <nav className="absolute top-0 right-0 w-full p-6 md:p-8 flex justify-end items-center gap-4 md:gap-6 text-sm font-semibold text-slate-400">
          <a href="#" className="hover:text-white transition-colors">
            About Us
          </a>
          <span className="text-slate-700">|</span>
          <a href="#" className="hover:text-white transition-colors">
            FAQ
          </a>
          <span className="text-slate-700">|</span>
          <a href="#" className="hover:text-white transition-colors">
            Profile
          </a>
        </nav>

        <div className="flex-grow flex flex-col items-center justify-center px-6">
          <img
            src="/mapscore_logo_final.svg"
            alt="MapScore Logo"
            className="w-80 sm:w-96 md:w-[500px] lg:w-[700px] xl:w-[800px] h-auto mb-4 drop-shadow-2xl"
          />

          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full sm:w-auto">
            <a
              href="http://localhost:3000/auth/google"
              className="w-full sm:w-auto flex items-center justify-center gap-3 bg-white text-slate-900 font-bold text-sm md:text-base py-3.5 px-8 rounded-full hover:bg-slate-200 transition-colors shadow-lg"
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                alt="Google"
                className="w-5 h-5"
              />
              Google Login
            </a>

            <span className="hidden sm:block text-slate-700 font-light text-xl">
              |
            </span>

            <button
              onClick={() =>
                setUser({
                  id: "dev-user",
                  name: "Developer Admin",
                  email: "admin@mapscore.app",
                })
              }
              className="w-full sm:w-auto flex items-center justify-center gap-3 bg-slate-800 border border-slate-700 text-white font-bold text-sm md:text-base py-3.5 px-8 rounded-full hover:bg-slate-700 hover:border-slate-500 transition-colors shadow-lg"
            >
              <span className="material-symbols-outlined text-[20px]">
                code
              </span>
              Dev Login
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (isAnalyzing)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100 px-6 text-center font-sans">
        <span className="material-symbols-outlined text-blue-500 text-4xl animate-spin mb-4">
          autorenew
        </span>
        <h3 className="text-xl font-bold mb-2 text-white">
          Analyzing Your Business...
        </h3>
        <p className="text-slate-400 text-sm max-w-sm">
          Please wait a moment while we gather data from Google Maps.
        </p>
      </div>
    );

  const topBusiness = getTopBusiness();
  const chartData = getChartData();
  const chartLabels = getChartLabels();
  const maxChartValue = Math.max(...chartData, 100);

  return (
    <div className="bg-slate-900 text-slate-200 min-h-screen flex flex-col md:flex-row font-sans">
      <nav
        className={`hidden md:flex flex-col fixed left-0 top-0 h-screen z-40 bg-slate-950 border-r border-slate-800 shadow-xl transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "w-56" : "w-16"
        }`}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-center h-[60px]">
          <div
            className={`flex items-center w-full ${
              isSidebarOpen ? "gap-3" : "justify-center"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-md">
              M
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden whitespace-nowrap">
                <h1 className="font-bold text-base text-white leading-tight">
                  MapScore
                </h1>
                <p className="text-[10px] font-medium text-slate-400">
                  Local Analytics
                </p>
              </div>
            )}
          </div>
        </div>

        <ul className="flex flex-col py-4 flex-grow gap-1.5 px-3">
          {["dashboard", "leaderboard", "checklist", "profile", "search"].map(
            (t: any) => {
              const isActive = activeTab === t;
              const labels: any = {
                dashboard: "My Dashboard",
                leaderboard: "Competitor Rank",
                checklist: "To-Do List",
                profile: "My Profile",
                search: "Add Business",
              };
              const icons: any = {
                dashboard: "insights",
                leaderboard: "format_list_numbered",
                checklist: "checklist",
                profile: "account_circle",
                search: "search",
              };
              return (
                <li key={t}>
                  <button
                    onClick={() => setActiveTab(t)}
                    title={labels[t]}
                    className={`w-full flex items-center ${
                      isSidebarOpen
                        ? "justify-start px-3"
                        : "justify-center px-0"
                    } py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] flex-shrink-0">
                      {icons[t]}
                    </span>
                    {isSidebarOpen && (
                      <span className="ml-3 truncate">{labels[t]}</span>
                    )}
                  </button>
                </li>
              );
            }
          )}
        </ul>

        <div className="p-3 border-t border-slate-800">
          <button
            onClick={() => {
              setUser(null);
              setDashboardData(null);
            }}
            title="Sign Out"
            className={`w-full flex items-center ${
              isSidebarOpen ? "justify-start px-3" : "justify-center px-0"
            } gap-3 hover:bg-red-500/20 text-slate-400 hover:text-red-400 font-semibold text-sm py-2.5 rounded-lg transition-colors`}
          >
            <span className="material-symbols-outlined text-[20px] flex-shrink-0">
              logout
            </span>
            {isSidebarOpen && <span className="truncate">Sign Out</span>}
          </button>
        </div>
      </nav>

      <main
        className={`flex-grow flex flex-col pb-20 md:pb-0 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "md:ml-56" : "md:ml-16"
        }`}
      >
        <header className="bg-slate-950 md:bg-slate-900/50 shadow-sm md:shadow-none sticky top-0 z-30 flex justify-between items-center w-full px-4 sm:px-6 py-3 border-b border-slate-800 h-[60px] backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden md:flex text-slate-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">
                menu
              </span>
            </button>
            <div className="md:hidden w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              M
            </div>
            <h1 className="md:hidden font-bold text-base text-white">
              MapScore
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div
              onClick={() => setActiveTab("profile")}
              title={user.email}
              className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white text-xs uppercase cursor-pointer hover:ring-2 ring-blue-500 transition-all"
            >
              {user.name?.charAt(0)}
            </div>
          </div>
        </header>

        <div className="px-4 sm:px-6 md:px-10 py-6 flex-grow">
          {/* TAB: SEARCH */}
          {activeTab === "search" && (
            <div className="max-w-2xl mx-auto flex flex-col justify-center min-h-[60vh] animate-in fade-in duration-300">
              <div className="mb-8 text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Find Your Business
                </h2>
                <p className="text-slate-400 text-sm">
                  Enter your business name and city to see how you rank.
                </p>
              </div>
              <form
                onSubmit={handleSearch}
                className="flex flex-col sm:flex-row gap-3 mb-8 bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-sm w-full"
              >
                <div className="flex-1">
                  <label className="block text-slate-400 text-xs font-semibold mb-1 ml-1 uppercase tracking-wide">
                    Business Name
                  </label>
                  <input
                    required
                    className="w-full bg-slate-900 border border-slate-600 p-2.5 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="e.g. John's Coffee"
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-slate-400 text-xs font-semibold mb-1 ml-1 uppercase tracking-wide">
                    City
                  </label>
                  <input
                    required
                    className="w-full bg-slate-900 border border-slate-600 p-2.5 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                    placeholder="e.g. Jakarta Selatan"
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    disabled={isSearching}
                    className="w-full sm:w-auto bg-blue-600 text-white font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-blue-500 disabled:opacity-50 whitespace-nowrap"
                  >
                    {isSearching ? "Searching..." : "Search"}
                  </button>
                </div>
              </form>
              <div className="space-y-3 w-full">
                {searchResults.map((b, i) => (
                  <div
                    key={i}
                    className="p-4 bg-slate-800 border border-slate-700 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-blue-500 transition-colors"
                  >
                    <div>
                      <h4 className="font-bold text-base text-white mb-1">
                        {b.name}
                      </h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">
                          location_on
                        </span>
                        {b.location}
                      </p>
                    </div>
                    <button
                      onClick={() => handleSelectBusiness(b)}
                      className="w-full sm:w-auto bg-slate-700 hover:bg-white hover:text-slate-900 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!dashboardData &&
            (activeTab === "dashboard" ||
              activeTab === "leaderboard" ||
              activeTab === "checklist") && (
              <div className="flex flex-col items-center justify-center mt-20 text-center animate-in fade-in">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl text-slate-500">
                    monitoring
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  No Dashboard Selected
                </h2>
                <p className="text-slate-400 text-sm max-w-sm mb-6">
                  Please select a business from your profile or search for a new
                  one.
                </p>
                <button
                  onClick={() => setActiveTab("profile")}
                  className="bg-blue-600 text-white font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-blue-500 transition-colors"
                >
                  Open Profile
                </button>
              </div>
            )}

          {activeTab === "dashboard" && dashboardData && (
            <div className="animate-in fade-in duration-300 max-w-5xl mx-auto">
              <header className="mb-6 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  {dashboardData.business.name}
                </h2>
                <p className="text-slate-400 text-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">
                    location_on
                  </span>
                  {dashboardData.business.location}
                </p>
              </header>

              <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-sm flex flex-col justify-center items-center text-center">
                  <h2 className="font-semibold text-sm text-slate-400 mb-1">
                    Total MapScore
                  </h2>
                  <div className="text-4xl font-extrabold text-blue-400">
                    {totalScore}
                    <span className="text-lg text-slate-500 font-medium ml-1">
                      /100
                    </span>
                  </div>
                </div>
                <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-sm flex flex-col justify-center items-center text-center">
                  <h2 className="font-semibold text-sm text-slate-400 mb-1">
                    Local Rank
                  </h2>
                  <div className="text-4xl font-extrabold text-white">
                    #{dashboardData.business.scoreHistory[0]?.rank || 1}
                  </div>
                </div>
                <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-sm flex flex-col justify-center items-center text-center">
                  <h2 className="font-semibold text-sm text-slate-400 mb-1">
                    Total Reviews
                  </h2>
                  <div className="text-4xl font-extrabold text-emerald-400">
                    {dashboardData.business.totalReviews}
                  </div>
                </div>
              </section>

              <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-sm mb-6">
                <div className="p-5 border-b border-slate-700 bg-slate-900/30">
                  <h3 className="text-lg font-bold text-white mb-1">
                    Matriks Penilaian MapScore
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Rincian dari mana skor Anda berasal berdasarkan metrik SEO
                    lokal.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[500px]">
                    <thead className="bg-slate-900/50">
                      <tr>
                        <th className="p-4 text-slate-400 uppercase text-xs font-bold w-12 text-center">
                          No
                        </th>
                        <th className="p-4 text-slate-400 uppercase text-xs font-bold">
                          Aspek Penilaian
                        </th>
                        <th className="p-4 text-center text-slate-400 uppercase text-xs font-bold w-32">
                          Skor Didapat
                        </th>
                        <th className="p-4 text-center text-slate-400 uppercase text-xs font-bold w-32">
                          Skor Maksimal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {matrix.map((m) => (
                        <tr
                          key={m.id}
                          className="hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="p-4 text-center text-sm font-bold text-slate-500">
                            {m.id}
                          </td>
                          <td className="p-4 text-sm font-semibold text-white">
                            {m.name}
                          </td>
                          <td className="p-4 text-center text-sm font-bold text-blue-400">
                            {m.score}
                          </td>
                          <td className="p-4 text-center text-sm font-bold text-slate-500">
                            {m.max}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-900/50">
                        <td
                          colSpan={2}
                          className="p-4 text-right text-sm font-bold text-slate-400 uppercase tracking-widest"
                        >
                          Total Skor Keseluruhan
                        </td>
                        <td className="p-4 text-center text-xl font-extrabold text-blue-400">
                          {totalScore}
                        </td>
                        <td className="p-4 text-center text-xl font-extrabold text-slate-500">
                          100
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="text-center sm:text-left">
                  <h3 className="text-lg font-bold text-white mb-1">
                    Skor Anda belum maksimal?
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Lihat daftar tugas yang dibuat khusus untuk menutupi
                    kekurangan skor di atas.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("checklist")}
                  className="w-full sm:w-auto bg-blue-600 text-white font-bold text-sm px-6 py-2.5 rounded-lg hover:bg-blue-500 transition-colors shadow-sm whitespace-nowrap"
                >
                  View To-Do List
                </button>
              </div>
            </div>
          )}

          {/* TAB: LEADERBOARD */}
          {activeTab === "leaderboard" && dashboardData && (
            <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">
                  Competitor Rank
                </h2>
                <p className="text-slate-400 text-sm">
                  See how you compare to top businesses in your area.
                </p>
              </div>
              <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[500px]">
                    <thead className="bg-slate-900/50">
                      <tr>
                        <th className="p-4 text-slate-400 uppercase text-xs font-bold">
                          Rank
                        </th>
                        <th className="p-4 text-slate-400 uppercase text-xs font-bold">
                          Business Name
                        </th>
                        <th className="p-4 text-slate-400 uppercase text-xs font-bold">
                          Rating
                        </th>
                        <th className="p-4 text-center text-slate-400 uppercase text-xs font-bold">
                          Reviews
                        </th>
                        <th className="text-right p-4 text-slate-400 uppercase text-xs font-bold">
                          Score
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {dashboardData.competitors.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-10 text-center">
                            <span className="material-symbols-outlined text-3xl text-blue-500 animate-spin mb-2 block">
                              autorenew
                            </span>
                            <p className="text-slate-400 text-sm">
                              Gathering data...
                            </p>
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
                                  ? "bg-blue-900/20"
                                  : "hover:bg-slate-700/30"
                              } transition-colors`}
                            >
                              <td className="p-4 text-lg font-bold text-slate-500">
                                {c.rank}
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`font-semibold text-sm ${
                                      isUser ? "text-blue-400" : "text-white"
                                    }`}
                                  >
                                    {c.name}
                                  </span>
                                  {isUser && (
                                    <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase">
                                      You
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4 text-sm font-bold text-yellow-400">
                                {c.rating ? c.rating.toFixed(1) : "0.0"}{" "}
                                <span className="opacity-80">★</span>
                              </td>
                              <td className="p-4 text-center text-sm font-semibold text-slate-300">
                                {c.reviews || 0}
                              </td>
                              <td className="p-4 text-right text-lg font-bold text-white">
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
            </div>
          )}

          {activeTab === "checklist" && dashboardData && (
            <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">
                  Targeted To-Do List
                </h2>
                <p className="text-slate-400 text-sm">
                  Tugas di bawah ini disusun khusus untuk menutupi kekurangan
                  skor di matriks Anda.
                </p>
              </div>

              <div className="space-y-4">
                {dynamicTasks.map((t: any, i: number) => {
                  const isCompleted = completedTaskIds.includes(i);
                  const isExpanded = expandedTaskId === i;
                  return (
                    <div
                      key={i}
                      className={`rounded-2xl transition-all border overflow-hidden cursor-pointer ${
                        isCompleted
                          ? "bg-slate-900 border-slate-800 opacity-60"
                          : "bg-slate-800 border-slate-700 hover:border-blue-500 shadow-sm"
                      }`}
                      onClick={() => setExpandedTaskId(isExpanded ? null : i)}
                    >
                      <div className="p-4 sm:p-5 flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTask(i);
                            }}
                            className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                              isCompleted
                                ? "bg-emerald-500 border-emerald-500"
                                : "border-slate-500 bg-slate-900 hover:border-blue-400"
                            }`}
                          >
                            {isCompleted && (
                              <span className="material-symbols-outlined text-white text-[18px] font-bold">
                                check
                              </span>
                            )}
                          </button>
                          <div>
                            <p
                              className={`font-semibold text-sm sm:text-base pr-2 truncate ${
                                isCompleted
                                  ? "text-slate-500 line-through"
                                  : "text-white"
                              }`}
                            >
                              {generateShortTitle(t.description)}
                            </p>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">
                              Aspek: {t.aspect}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center flex-shrink-0 ml-2">
                          <span
                            className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${
                              isExpanded ? "rotate-180" : "rotate-0"
                            }`}
                          >
                            expand_more
                          </span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 sm:px-5 pb-5 pl-[64px] sm:pl-[68px] animate-in slide-in-from-top-2 duration-300">
                          <div className="border-t border-slate-700 pt-4 mt-1">
                            <p className="text-slate-300 text-sm leading-relaxed mb-4">
                              {t.description}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="bg-blue-900/50 border border-blue-800/50 text-blue-400 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 w-fit">
                                <span className="material-symbols-outlined text-[14px]">
                                  bolt
                                </span>
                                Impact Score: +{t.impactScore} Pts
                              </span>
                            </div>
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
            <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-1">
                  Profile Overview
                </h2>
                <p className="text-slate-400 text-sm">
                  Track the performance of all your properties.
                </p>
              </div>

              {myBusinesses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-slate-800 border border-dashed border-slate-600 rounded-2xl text-center">
                  <span className="material-symbols-outlined text-4xl text-slate-500 mb-3">
                    domain_add
                  </span>
                  <h3 className="text-lg font-bold text-white mb-2">
                    No Businesses Saved
                  </h3>
                  <p className="text-slate-400 text-sm mb-6 max-w-sm">
                    Add your business to start tracking your local SEO
                    performance.
                  </p>
                  <button
                    onClick={() => setActiveTab("search")}
                    className="bg-blue-600 text-white font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-blue-500 transition-colors"
                  >
                    Add a Business
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 flex flex-col justify-center items-center text-center shadow-sm">
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
                        Total Businesses
                      </p>
                      <p className="text-4xl font-extrabold text-white">
                        {myBusinesses.length}
                      </p>
                    </div>

                    <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 flex flex-col justify-center items-center text-center shadow-sm">
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
                        Top Business
                      </p>
                      {topBusiness ? (
                        <>
                          <p className="text-lg font-bold text-blue-400 truncate w-full px-2">
                            {topBusiness.name}
                          </p>
                          <p className="text-sm font-semibold text-slate-300">
                            Score: {topBusiness.scoreHistory?.[0]?.score || 0}
                          </p>
                        </>
                      ) : (
                        <p className="text-slate-500 text-sm">No data yet</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 mb-6 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-base font-bold text-white">
                        Business Growth Stats
                      </h3>
                      <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                        {["day", "week", "month"].map((t) => (
                          <button
                            key={t}
                            onClick={() => setChartTimeRange(t as any)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                              chartTimeRange === t
                                ? "bg-blue-600 text-white"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="relative h-40 flex items-end justify-between gap-2 border-b border-slate-700 pb-2">
                      {chartData.map((val, idx) => {
                        const heightPercentage = (val / maxChartValue) * 100;
                        return (
                          <div
                            key={idx}
                            className="flex flex-col items-center flex-1 group"
                          >
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-white mb-1">
                              {val}
                            </span>
                            <div
                              className="w-full max-w-[40px] bg-blue-500 rounded-t-sm transition-all duration-500 ease-out group-hover:bg-blue-400"
                              style={{ height: `${heightPercentage}%` }}
                            ></div>
                            <span className="text-[10px] font-medium text-slate-400 mt-2 absolute -bottom-6">
                              {chartLabels[idx]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-8 text-center">
                      <p className="text-xs text-slate-500 font-medium">
                        Average MapScore Growth (Simulated)
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-700 bg-slate-900/30">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        Your Businesses
                      </h3>
                    </div>

                    <div className="divide-y divide-slate-700">
                      {myBusinesses.map((b) => (
                        <div
                          key={b.id}
                          className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-700/20 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="text-base font-bold text-white truncate">
                                {b.name}
                              </h4>
                              <span className="bg-blue-900/50 text-blue-400 text-xs font-bold px-2 py-0.5 rounded border border-blue-800">
                                {b.scoreHistory?.[0]?.score || 0} Score
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 truncate">
                              {b.location}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => handleOpenDashboard(b)}
                              className="flex-1 sm:flex-none bg-slate-700 hover:bg-white hover:text-slate-900 px-4 py-2 rounded-lg text-xs font-bold transition-colors"
                            >
                              Dashboard
                            </button>
                            <button
                              onClick={() => handleDeleteBusiness(b.id)}
                              className="bg-slate-900 hover:bg-red-500/20 text-slate-500 hover:text-red-400 px-3 py-2 rounded-lg transition-colors border border-slate-700"
                              title="Delete Business"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                delete
                              </span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 w-full bg-slate-950 border-t border-slate-800 px-1 py-2 z-50 shadow-[0_-5px_10px_rgba(0,0,0,0.3)]">
        <ul className="flex justify-around items-center w-full">
          {["dashboard", "search", "profile"].map((t: any) => {
            const labels: any = {
              dashboard: "Dashboard",
              search: "Search",
              profile: "Profile",
            };
            const icons: any = {
              dashboard: "insights",
              search: "search",
              profile: "account_circle",
            };
            const isActive = activeTab === t;
            return (
              <li key={t} className="flex-1">
                <button
                  onClick={() => setActiveTab(t)}
                  className={`w-full flex flex-col items-center gap-1 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? "text-blue-400 bg-slate-900"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className="material-symbols-outlined text-[22px]">
                    {icons[t]}
                  </span>
                  <span className="text-[10px] font-bold">{labels[t]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
