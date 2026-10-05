import { makeCollectionRoutes } from '@/lib/admin/resource';
import { timelineConfig } from './config';

export const dynamic = 'force-dynamic';
const routes = makeCollectionRoutes(timelineConfig);
export const GET = routes.GET;
export const POST = routes.POST;
export const PATCH = routes.PATCH!;
