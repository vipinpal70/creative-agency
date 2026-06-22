import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText } from "lucide-react";
import type { ContentBucket, CopyEntry } from "./types";

interface Props {
  buckets: ContentBucket[];
  platforms: readonly string[];
  mediaTypes: readonly string[];
  onAddCopy: (copy: CopyEntry) => void;
}

export function CopyEntryForm({ buckets, platforms, mediaTypes, onAddCopy }: Props) {
  const [creativeCopy, setCreativeCopy] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [publishTime, setPublishTime] = useState("");
  const [contentBucketId, setContentBucketId] = useState("");
  const [platform, setPlatform] = useState("");
  const [mediaType, setMediaType] = useState("");

  const isValid = creativeCopy.trim() && caption.trim() && publishDate && contentBucketId && platform && mediaType;

  const handleAdd = () => {
    if (!isValid) return;
    onAddCopy({
      id: crypto.randomUUID(),
      creativeCopy,
      caption,
      hashtags,
      publishDate,
      publishTime,
      contentBucketId,
      platform,
      mediaType,
      status: "Draft",
    });
    setCreativeCopy("");
    setCaption("");
    setHashtags("");
    setPublishDate("");
    setPublishTime("");
    setContentBucketId("");
    setPlatform("");
    setMediaType("");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Add New Copy</CardTitle>
            <CardDescription>Fill in copy details for a single creative post</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Creative Copy *</label>
          <Textarea
            placeholder="The main creative copy / content for this post..."
            className="min-h-[100px]"
            value={creativeCopy}
            onChange={(e) => setCreativeCopy(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Caption *</label>
          <Textarea
            placeholder="Caption that accompanies the creative..."
            className="min-h-[80px]"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Hashtags</label>
          <Input
            placeholder="#marketing #socialmedia #growth"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Publish Date *</label>
            <Input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Publish Time</label>
            <Input type="time" value={publishTime} onChange={(e) => setPublishTime(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Content Bucket *</label>
            <Select value={contentBucketId} onValueChange={setContentBucketId}>
              <SelectTrigger>
                <SelectValue placeholder="Select bucket" />
              </SelectTrigger>
              <SelectContent>
                {buckets.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Platform *</label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Media Type *</label>
            <Select value={mediaType} onValueChange={setMediaType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {mediaTypes.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleAdd} disabled={!isValid}>
            <Plus className="h-4 w-4 mr-1" /> Add Copy to Calendar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
