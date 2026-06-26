export interface GanttTaskRecord {
  id:        string;
  text:      string;
  start:     string;
  end?:      string | null;
  duration:  number;
  progress:  number;
  type:      string;
  parent?:   string | null;
  orderId:   number;
  clientId:  string;
  createdAt: string;
  updatedAt: string;
}

export interface GanttLinkRecord {
  id:       string;
  source:   string;
  target:   string;
  type:     string;
  clientId: string;
}

export interface GanttTaskClient {
  id:       string;
  text:     string;
  start:    Date;
  end?:     Date;
  duration: number;
  progress: number;
  type:     string;
  parent?:  string;
  orderId:  number;
  clientId: string;
}

export interface GanttLinkClient {
  id:       string;
  source:   string;
  target:   string;
  type:     string;
  clientId: string;
}

export interface CreateGanttTaskBody {
  text?:     string;
  start?:    string;
  end?:      string;
  duration?: number;
  progress?: number;
  type?:     string;
  parent?:   string;
  mode?:     "before" | "after" | "child";
  target?:   string;
  orderId?:  number;
}

export interface UpdateGanttTaskBody {
  text?:      string;
  start?:     string;
  end?:       string;
  duration?:  number;
  progress?:  number;
  type?:      string;
  parent?:    string;
  orderId?:   number;
  operation?: "move";
  mode?:      "before" | "after" | "child";
  target?:    string;
}

export interface CreateGanttLinkBody {
  source: string;
  target: string;
  type:   string;
}
