import { Card } from "@/components/ui/card";

interface ShotApprovalHistogramProps {
  oneShot: number;
  twoShot: number;
  twoPlusShot: number;
  inProgress: number;
}

const BUCKETS = [
  { key: "oneShot", label: "One-shot", desc: "Approved with no changes" },
  { key: "twoShot", label: "Two-shot", desc: "1 change requested" },
  { key: "twoPlusShot", label: "2+ shot", desc: "2 or more changes" },
] as const;

// A distribution over three ordered buckets. All three bars measure the same
// thing (count of approved copies), so this is single-hue magnitude — no
// categorical palette, no legend. Column marks anchor to the baseline with
// rounded data-ends; direct labels sit above each bar (never one per point
// elsewhere, but here there are only three).
export function ShotApprovalHistogram({
  oneShot,
  twoShot,
  twoPlusShot,
  inProgress,
}: ShotApprovalHistogramProps) {
  const values = { oneShot, twoShot, twoPlusShot };
  const total = oneShot + twoShot + twoPlusShot;
  const max = Math.max(oneShot, twoShot, twoPlusShot, 1);

  return (
    <Card className="border-gray-100 p-5">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Shot-approval distribution</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            How many review cycles each approved copy needed
          </p>
        </div>
        <span className="text-xs text-muted-foreground">{total} approved</span>
      </div>

      {total === 0 ? (
        <p className="py-14 text-center text-sm text-gray-400">
          No approved copies in this range yet.
        </p>
      ) : (
        <div className="mt-6 flex items-end gap-4" style={{ height: 200 }}>
          {BUCKETS.map((b) => {
            const value = values[b.key];
            const pct = total ? Math.round((value / total) * 100) : 0;
            const barHeight = `${(value / max) * 100}%`;
            return (
              <div key={b.key} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex w-full flex-1 items-end justify-center">
                  <div
                    className="w-full max-w-[92px] rounded-t bg-[#2a78d6] transition-[height]"
                    style={{ height: barHeight, minHeight: value > 0 ? 4 : 0 }}
                    title={`${b.label}: ${value} copies (${pct}%)`}
                  />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold tabular-nums text-foreground">{value}</p>
                  <p className="text-xs font-medium text-foreground">{b.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {pct}% · {b.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {inProgress > 0 && (
        <p className="mt-4 border-t border-gray-100 pt-3 text-[11px] text-gray-400">
          {inProgress} {inProgress === 1 ? "copy is" : "copies are"} still in
          progress and excluded from this chart.
        </p>
      )}
    </Card>
  );
}
