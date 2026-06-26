// =====================================================
// GanttSkeleton — pixel-accurate placeholder
// Matches the real layout: toolbar + grid rows + timeline header
// Prevents layout shift while data loads
// =====================================================

export function GanttSkeleton() {
  return (
    <div className="flex flex-col w-full h-full animate-pulse" aria-busy="true" aria-label="Loading Gantt chart">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white shrink-0">
        {[80, 96, 72, 72, 56, 56].map((w, i) => (
          <div key={i} className="h-7 rounded-md bg-gray-200" style={{ width: w }} />
        ))}
        <div className="ml-auto flex gap-2">
          {[40, 40].map((w, i) => (
            <div key={i} className="h-7 w-10 rounded-md bg-gray-200" />
          ))}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left grid skeleton */}
        <div className="w-[440px] shrink-0 border-r border-gray-200 bg-white flex flex-col">
          {/* Column headers */}
          <div className="flex border-b border-gray-200 bg-gray-50 px-3 py-2 gap-4">
            <div className="h-4 w-40 rounded bg-gray-200" />
            <div className="h-4 w-24 rounded bg-gray-200 ml-auto" />
            <div className="h-4 w-16 rounded bg-gray-200" />
          </div>
          {/* Task rows */}
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-100"
              style={{ paddingLeft: i % 3 !== 0 ? 28 : 12 }}
            >
              <div className="h-4 rounded bg-gray-200" style={{ width: i % 3 === 0 ? 160 : 120 }} />
              <div className="ml-auto h-3.5 w-20 rounded bg-gray-100" />
              <div className="h-3.5 w-10 rounded bg-gray-100" />
            </div>
          ))}
        </div>

        {/* Right timeline skeleton */}
        <div className="flex-1 bg-white flex flex-col overflow-hidden">
          {/* Month header */}
          <div className="flex border-b border-gray-200 bg-gray-50 h-8">
            {[140, 160, 120, 180].map((w, i) => (
              <div key={i} className="border-r border-gray-200 flex items-center px-2" style={{ width: w }}>
                <div className="h-3 rounded bg-gray-200" style={{ width: w * 0.6 }} />
              </div>
            ))}
          </div>
          {/* Day/week header */}
          <div className="flex border-b border-gray-200 h-6 bg-gray-50">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="w-8 border-r border-gray-100 flex items-center justify-center">
                <div className="h-2.5 w-4 rounded bg-gray-200" />
              </div>
            ))}
          </div>
          {/* Bar rows */}
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex items-center h-10 border-b border-gray-100 px-2 gap-1">
              {i % 3 !== 0 && (
                <div
                  className="h-5 rounded-sm"
                  style={{
                    width: `${50 + Math.random() * 120}px`,
                    marginLeft: `${20 + i * 15}px`,
                    backgroundColor: i % 3 === 1 ? '#e2e8f0' : '#dbeafe',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
