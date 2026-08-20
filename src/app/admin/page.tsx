import { redirect } from 'next/navigation';

import { AdminPanel } from '@/components/admin/AdminPanel';
import { isAuthenticated } from '@/lib/adminAuth';
import { getProjects } from '@/lib/projectsServer';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!(await isAuthenticated())) redirect('/admin/login');

  const projects = await getProjects();
  return <AdminPanel initialProjects={projects} />;
}
