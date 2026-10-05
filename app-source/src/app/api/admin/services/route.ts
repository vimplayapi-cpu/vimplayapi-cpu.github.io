import { makeCollectionRoutes } from '@/lib/admin/resource';
import { servicesConfig } from './config';

export const dynamic = 'force-dynamic';
const routes = makeCollectionRoutes(servicesConfig);
export const GET = routes.GET;
export const POST = routes.POST;
export const PATCH = routes.PATCH!;
