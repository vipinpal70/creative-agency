import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, Target } from "lucide-react";

interface Props {
  objective: string;
  onChange: (val: string) => void;
  onNext: () => void;
}

export function ObjectiveStep({ objective, onChange, onNext }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Target className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Step 1: Monthly Objective</CardTitle>
            <CardDescription>Define the overarching goal for this month's content</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="e.g., Increase brand awareness through educational content and drive 20% more engagement on Instagram..."
          className="min-h-[120px]"
          value={objective}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="flex justify-end">
          <Button onClick={onNext} disabled={!objective.trim()}>
            Next: Content Buckets <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
