import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Plus, Trash2, Layers } from "lucide-react";
import type { ContentBucket } from "./types";

interface Props {
  buckets: ContentBucket[];
  onChange: (buckets: ContentBucket[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function BucketsStep({ buckets, onChange, onNext, onBack }: Props) {
  const addBucket = () => {
    onChange([...buckets, { id: crypto.randomUUID(), name: "", description: "" }]);
  };

  const updateBucket = (id: string, field: keyof Omit<ContentBucket, "id">, value: string) => {
    onChange(buckets.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const removeBucket = (id: string) => {
    onChange(buckets.filter((b) => b.id !== id));
  };

  const isValid = buckets.length > 0 && buckets.every((b) => b.name.trim());

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Step 2: Content Buckets</CardTitle>
            <CardDescription>Define 3-4 content themes/buckets for the month</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {buckets.map((bucket, index) => (
          <div key={bucket.id} className="p-4 rounded-lg border border-border bg-accent/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Bucket {index + 1}
              </span>
              {buckets.length > 1 && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeBucket(bucket.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              )}
            </div>
            <Input
              placeholder="Bucket name (e.g., Educational Tips, Behind the Scenes)"
              value={bucket.name}
              onChange={(e) => updateBucket(bucket.id, "name", e.target.value)}
            />
            <Textarea
              placeholder="Brief description of this content bucket..."
              className="min-h-[70px]"
              value={bucket.description}
              onChange={(e) => updateBucket(bucket.id, "description", e.target.value)}
            />
          </div>
        ))}

        <Button variant="outline" className="w-full" onClick={addBucket}>
          <Plus className="h-4 w-4 mr-1" /> Add Content Bucket
        </Button>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button onClick={onNext} disabled={!isValid}>
            Next: Create Copies <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
