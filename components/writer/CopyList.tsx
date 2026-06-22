import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Send, Trash2, Calendar, Hash, Monitor, Image } from "lucide-react";
import type { ContentBucket, CopyEntry } from "./types";

interface Props {
  copies: CopyEntry[];
  buckets: ContentBucket[];
  onRemove: (id: string) => void;
  onSubmitSingle: (id: string) => void;
  onSubmitAll: () => void;
}

export function CopyList({ copies, buckets, onRemove, onSubmitSingle, onSubmitAll }: Props) {
  const getBucketName = (id: string) => buckets.find((b) => b.id === id)?.name || "Unknown";
  const draftCopies = copies.filter((c) => c.status === "Draft");

  if (copies.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No copies added yet. Use the form above to add your first copy.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Calendar Copies ({copies.length})</CardTitle>
            <CardDescription>{draftCopies.length} draft(s) ready for review</CardDescription>
          </div>
          {draftCopies.length > 1 && (
            <Button onClick={onSubmitAll} size="sm">
              <Send className="h-3.5 w-3.5 mr-1" /> Submit All for Review
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {copies.map((copy) => (
          <div key={copy.id} className="p-4 rounded-lg border border-border bg-accent/10 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground line-clamp-2">{copy.creativeCopy}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{copy.caption}</p>
              </div>
              <StatusBadge status={copy.status} />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {copy.publishDate}{copy.publishTime ? ` at ${copy.publishTime}` : ""}
              </span>
              <span className="flex items-center gap-1">
                <Monitor className="h-3 w-3" />
                {copy.platform}
              </span>
              <span className="flex items-center gap-1">
                <Image className="h-3 w-3" />
                {copy.mediaType}
              </span>
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {getBucketName(copy.contentBucketId)}
              </span>
            </div>

            {copy.hashtags && (
              <p className="text-xs text-primary/70">{copy.hashtags}</p>
            )}

            <div className="flex items-center gap-2 pt-1">
              {copy.status === "Draft" && (
                <Button variant="outline" size="sm" onClick={() => onSubmitSingle(copy.id)}>
                  <Send className="h-3 w-3 mr-1" /> Submit for Review
                </Button>
              )}
              {copy.status === "Draft" && (
                <Button variant="ghost" size="sm" onClick={() => onRemove(copy.id)}>
                  <Trash2 className="h-3 w-3 mr-1 text-destructive" /> Remove
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
