export function AnalyticsSection() {
  return (
    <div className="space-y-4 w-full mt-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1 pr-4">
          <p className="text-xl font-syne text-white">Analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Chart Card */}
        <div className="flex flex-col justify-between gap-4 rounded-3xl bg-white/[0.04] border border-white/5 px-6 py-6 w-full hover:border-[#58A0B4]/30 transition-all duration-300">
          <div className="flex w-full">
            <div className="flex flex-col gap-1 w-full text-left">
              <p className="text-lg text-white font-syne">
                1,492 Requests (Last 7 days)
              </p>
              <span className="text-sm text-gray-500">
                Number of total API requests processed automatically.
              </span>
            </div>
          </div>
          <div className="relative h-48 w-full flex items-center justify-center mt-4">
            <div className="flex items-end gap-1.5 h-full pb-0 px-2 w-full opacity-80">
              {[40, 70, 45, 90, 60, 100, 85, 50, 110, 65, 80, 50, 120, 95].map(
                (h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h / 1.2}%` }}
                    className="flex-1 bg-[#58A0B4] rounded-t-sm hover:opacity-80 hover:-translate-y-1 transition-all duration-200 cursor-crosshair"
                  />
                ),
              )}
            </div>
          </div>
        </div>

        {/* List Card */}
        <div className="flex flex-col gap-4 rounded-3xl bg-white/[0.04] border border-white/5 px-6 py-6 w-full hover:border-white/10 transition-all duration-300">
          <div className="flex w-full">
            <div className="flex flex-col gap-1 w-full text-left">
              <p className="text-lg text-white font-syne">
                Verification Results
              </p>
              <span className="text-sm text-gray-500">
                Breakdown of identity verifications this week.
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3 mt-4 flex-1">
            {[
              {
                label: "Approved Identities",
                value: "85%",
                color: "bg-[#58A0B4]",
              },
              {
                label: "Fraud Detected (Blocked)",
                value: "10%",
                color: "bg-red-500",
              },
              { label: "Manual Review", value: "3%", color: "bg-amber-500" },
              { label: "Pending Document", value: "2%", color: "bg-gray-500" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-4 bg-white/[0.02] hover:bg-white/[0.06] transition-colors p-3.5 rounded-xl border border-white/5 cursor-default"
              >
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-sm text-gray-300 font-medium">
                      {item.label}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">
                      {item.value}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color}`}
                      style={{ width: item.value }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
