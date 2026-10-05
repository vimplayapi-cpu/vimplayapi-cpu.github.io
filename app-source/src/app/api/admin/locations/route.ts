import { makeCollectionRoutes } from '@/lib/admin/resource';
import { locationsConfig } from './config';

export const dynamic = 'force-dynamic';
const routes = makeCollectionRoutes(locationsConfig);
export const GET = routes.GET;
export const POST = routes.POST;
export const PATCH = routes.PATCH!;
