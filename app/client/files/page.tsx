import { FileRepository } from "@/components/repository/FileRepository";

// Client portal file repository — same shared repository as staff. Read/download
// only for clients: the backend gates all writes behind canManageRepository
// (admin/member), and the component hides management controls when canManage is
// false (which it is for client accounts).
export default function ClientFilesPage() {
  return <FileRepository />;
}
